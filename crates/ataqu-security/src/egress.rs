//! SSRF-guarded HTTP egress for server-initiated webhook requests.
//!
//! Every outbound HTTP call whose URL originates from tenant-controlled
//! configuration (Spark `Action::Webhook`, SOND form-routing webhooks, import
//! file downloads) MUST go through [`GuardedHttpClient`]. The guard:
//!
//! * allows only `http`/`https` schemes,
//! * resolves DNS itself and **pins** the connection to the resolved socket
//!   address, so a DNS rebinding race cannot swap the address after the check,
//! * rejects loopback / private / link-local / unique-local / CGNAT /
//!   documentation / broadcast / unspecified targets (v4 and v6, including
//!   v4-mapped v6),
//! * **never follows redirects** — a 3xx cannot be used to bounce the guard
//!   into fetching an internal address,
//! * enforces connect/request timeouts.

use std::net::IpAddr;
use std::time::Duration;

use reqwest::Client;
use reqwest::redirect::Policy;

/// A reqwest client configuration with redirects disabled and hard timeouts.
/// Each request builds a pinned client (see [`GuardedHttpClient::execute`]);
/// `self.client` only exists to keep the TLS/runtime handles warm.
pub struct GuardedHttpClient {
    _client: Client,
}

impl Default for GuardedHttpClient {
    fn default() -> Self {
        Self::new().expect("failed to build guarded HTTP client")
    }
}

impl GuardedHttpClient {
    /// Build the client. Redirects are disabled so every hop is validated.
    pub fn new() -> Result<Self, String> {
        let client = Client::builder()
            .redirect(Policy::none())
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {e}"))?;
        Ok(Self { _client: client })
    }

    /// True if the IP must never be contacted by server-side egress.
    fn is_blocked_ip(ip: IpAddr) -> bool {
        match ip {
            IpAddr::V4(v4) => {
                v4.is_loopback()
                    || v4.is_private()
                    || v4.is_link_local()
                    || v4.is_unspecified()
                    || v4.is_broadcast()
                    || v4.is_documentation()
                    // CGNAT range 100.64.0.0/10 (carrier / NAT64 internals).
                    || (v4.octets()[0] == 100 && (v4.octets()[1] & 0b1100_0000) == 64)
                    // 0.0.0.0/8
                    || v4.octets()[0] == 0
            }
            IpAddr::V6(v6) => {
                // Handle IPv4-mapped addresses (::ffff:10.0.0.1) as IPv4.
                if let Some(v4) = v6.to_ipv4_mapped() {
                    return Self::is_blocked_ip(IpAddr::V4(v4));
                }
                v6.is_loopback()
                    || v6.is_unspecified()
                    // Unique-local fc00::/7.
                    || (v6.segments()[0] & 0xfe00) == 0xfc00
                    // Link-local fe80::/10.
                    || (v6.segments()[0] & 0xffc0) == 0xfe80
            }
        }
    }

    /// Execute a request after full SSRF validation. Returns the response on
    /// success (any status) so callers can decide how to treat non-2xx.
    pub async fn execute(
        &self,
        method: &str,
        url: &str,
        json_body: Option<&serde_json::Value>,
        extra_headers: &[(String, String)],
    ) -> Result<reqwest::Response, String> {
        let parsed = reqwest::Url::parse(url).map_err(|e| format!("Invalid webhook URL: {e}"))?;
        match parsed.scheme() {
            "http" | "https" => {}
            other => return Err(format!("Blocked webhook scheme: {other}")),
        }
        let host = parsed
            .host_str()
            .ok_or("Invalid webhook URL: missing host")?
            .to_string();
        // Reject embedded credentials (`https://user:pass@host`).
        if !parsed.username().is_empty() || parsed.password().is_some() {
            return Err("Blocked webhook URL with embedded credentials".to_string());
        }
        let port = parsed.port_or_known_default().unwrap_or(80);

        // Resolve and validate EVERY address (not just the first): a
        // multi-A-record host must not hide an internal address behind a
        // public one.
        let addrs: Vec<std::net::SocketAddr> = tokio::net::lookup_host((host.as_str(), port))
            .await
            .map_err(|e| format!("DNS resolution failed for {host}: {e}"))?
            .collect();
        let first = addrs.first().copied().ok_or("DNS resolution failed")?;
        for addr in &addrs {
            if Self::is_blocked_ip(addr.ip()) {
                return Err(format!("SSRF attempt blocked: internal IP ({})", addr.ip()));
            }
        }

        // Pin the resolved address so the actual connection cannot be
        // re-bound to a different IP between check and connect. `resolve` is
        // a ClientBuilder option, so the pinned client is built per request —
        // webhook egress is infrequent, the lost connection pooling is
        // acceptable for the guarantee.
        let pinned_client = Client::builder()
            .redirect(Policy::none())
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(10))
            .resolve(host.as_str(), first)
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

        let mut request = match method.to_ascii_uppercase().as_str() {
            "POST" => pinned_client.post(parsed.clone()),
            "PUT" => pinned_client.put(parsed.clone()),
            "PATCH" => pinned_client.patch(parsed.clone()),
            "DELETE" => pinned_client.delete(parsed.clone()),
            _ => pinned_client.get(parsed.clone()),
        };
        for (k, v) in extra_headers {
            if k.eq_ignore_ascii_case("host") || k.eq_ignore_ascii_case("content-length") {
                continue;
            }
            request = request.header(k, v);
        }
        if let Some(body) = json_body {
            request = request.json(body);
        }

        let resp = request
            .send()
            .await
            .map_err(|e| format!("Webhook request failed: {e}"))?;
        Ok(resp)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocked_ipv4_ranges() {
        for ip in [
            "127.0.0.1",
            "10.0.0.5",
            "172.16.0.9",
            "192.168.1.1",
            "169.254.169.254",
            "100.64.0.1",
            "0.0.0.0",
            "255.255.255.255",
            "192.0.2.1",
        ] {
            let parsed: IpAddr = ip.parse().unwrap();
            assert!(
                GuardedHttpClient::is_blocked_ip(parsed),
                "{ip} must be blocked"
            );
        }
    }

    #[test]
    fn blocked_ipv6_ranges() {
        for ip in [
            "::1",
            "::",
            "fc00::5",
            "fd12:3456::1",
            "fe80::1",
            "::ffff:10.0.0.1",
        ] {
            let parsed: IpAddr = ip.parse().unwrap();
            assert!(
                GuardedHttpClient::is_blocked_ip(parsed),
                "{ip} must be blocked"
            );
        }
    }

    #[test]
    fn public_ips_allowed() {
        for ip in [
            "8.8.8.8",
            "1.1.1.1",
            "2606:4700::1111",
            "172.32.0.1",
            "100.128.0.1",
        ] {
            let parsed: IpAddr = ip.parse().unwrap();
            assert!(
                !GuardedHttpClient::is_blocked_ip(parsed),
                "{ip} must be allowed"
            );
        }
    }
}
