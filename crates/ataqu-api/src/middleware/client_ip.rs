//! Resolving the effective client IP address behind optional trusted proxies.
//!
//! Security decisions (rate limiting, IP allowlists) must key off the *real*
//! client address, not a value the client can forge. When the server accepts
//! connections directly, the peer socket address (from axum `ConnectInfo`) is
//! authoritative. When it sits behind one or more trusted reverse proxies, the
//! proxy appends the original client to `X-Forwarded-For` (or sets `X-Real-IP`)
//! and those headers may be trusted *only* because the connection arrived from
//! a known proxy IP.
//!
//! `TrustedProxies` holds the set of proxy addresses/CIDRs that are allowed to
//! supply forwarding headers. If the peer is not in that set, forwarding
//! headers are ignored entirely (defeating header spoofing). This is the
//! standard "trust headers only from trusted peers" model used by nginx,
//! envoy, etc.
use axum::http::HeaderMap;
use ipnetwork::IpNetwork;
use std::net::IpAddr;

/// Addresses/CIDRs permitted to set `X-Forwarded-For` / `X-Real-IP`.
/// Empty means "trust no proxy" — forwarding headers are always ignored.
#[derive(Clone, Debug, Default)]
pub struct TrustedProxies(pub Vec<IpNetwork>);

impl TrustedProxies {
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// True when `ip` is one of the configured trusted proxies.
    pub fn contains(&self, ip: IpAddr) -> bool {
        self.0.iter().any(|net| net.contains(ip))
    }

    /// Parse a comma/whitespace-separated list of IPs or CIDR ranges.
    /// Invalid entries are skipped with a warning so a partially-bad config
    /// does not take the whole server down (and does not silently trust all).
    pub fn from_env_value(raw: &str) -> Self {
        let mut nets = Vec::new();
        for part in raw.split([',', ' ', '\n', '\t']).filter(|s| !s.is_empty()) {
            match part.parse::<IpNetwork>() {
                Ok(net) => nets.push(net),
                Err(_) => tracing::warn!(value = part, "Ignoring invalid TRUSTED_PROXIES entry"),
            }
        }
        TrustedProxies(nets)
    }
}

/// Resolve the effective client IP.
///
/// * If the peer is **not** a trusted proxy, its socket address is returned
///   unchanged (forwarding headers are attacker-controlled and ignored).
/// * If the peer **is** trusted, the client is taken from `X-Forwarded-For`
///   (the rightmost address that is not itself a trusted proxy — the original
///   client behind a chain) or, failing that, `X-Real-IP`. If neither yields a
///   usable address, the peer is returned as a safe fallback.
pub fn resolve_effective_client_ip(
    peer: IpAddr,
    headers: &HeaderMap,
    trusted: &TrustedProxies,
) -> IpAddr {
    if !trusted.contains(peer) {
        return peer;
    }

    if let Some(xff) = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
    {
        // XFF is a comma list from client to proxy. The original client is the
        // rightmost entry that is not itself a trusted proxy.
        for token in xff.split(',').map(str::trim).filter(|s| !s.is_empty()).rev() {
            if let Ok(ip) = token.parse::<IpAddr>()
                && !trusted.contains(ip)
            {
                return ip;
            }
        }
        // Every XFF hop is a trusted proxy, so we cannot recover the real
        // client from it; fall through to X-Real-IP / peer below.
    }

    if let Some(real) = headers
        .get("x-real-ip")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.trim().parse::<IpAddr>().ok())
    {
        return real;
    }

    peer
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    fn hdr(name: &str, val: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(
            axum::http::HeaderName::from_bytes(name.as_bytes()).unwrap(),
            HeaderValue::from_str(val).unwrap(),
        );
        h
    }

    #[test]
    fn untrusted_peer_ignores_xff_spoof() {
        let trusted = TrustedProxies::default();
        let peer: IpAddr = "203.0.113.9".parse().unwrap();
        let headers = hdr("x-forwarded-for", "1.2.3.4");
        assert_eq!(
            resolve_effective_client_ip(peer, &headers, &trusted),
            peer,
            "spoofed XFF must be ignored when peer is untrusted"
        );
    }

    #[test]
    fn trusted_proxy_uses_rightmost_untrusted_xff_hop() {
        let trusted = TrustedProxies::from_env_value("10.0.0.0/8");
        let peer: IpAddr = "10.1.2.3".parse().unwrap(); // a trusted proxy
        // client 198.51.100.7 -> proxy 10.9.9.9 -> us (10.1.2.3)
        let headers = hdr("x-forwarded-for", "198.51.100.7, 10.9.9.9");
        assert_eq!(
            resolve_effective_client_ip(peer, &headers, &trusted),
            "198.51.100.7".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn trusted_proxy_falls_back_to_x_real_ip() {
        let trusted = TrustedProxies::from_env_value("10.0.0.0/8");
        let peer: IpAddr = "10.1.2.3".parse().unwrap();
        let headers = hdr("x-real-ip", "198.51.100.42");
        assert_eq!(
            resolve_effective_client_ip(peer, &headers, &trusted),
            "198.51.100.42".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn all_xff_hops_trusted_falls_back_to_peer() {
        let trusted = TrustedProxies::from_env_value("10.0.0.0/8, 192.168.0.0/16");
        let peer: IpAddr = "10.1.2.3".parse().unwrap();
        let headers = hdr("x-forwarded-for", "10.9.9.9, 192.168.1.1");
        assert_eq!(
            resolve_effective_client_ip(peer, &headers, &trusted),
            peer,
            "if every XFF hop is a trusted proxy we cannot know the real client"
        );
    }

    #[test]
    fn invalid_env_entries_are_skipped() {
        let trusted = TrustedProxies::from_env_value("not-an-ip, 10.0.0.0/8, ,");
        assert_eq!(trusted.0.len(), 1);
        assert!(trusted.contains("10.1.1.1".parse::<IpAddr>().unwrap()));
    }
}
