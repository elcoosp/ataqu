//! Stateless, HMAC-signed double-submit CSRF tokens.
//!
//! This crate authenticates with bearer tokens / API keys, where classic CSRF
//! is not a threat (a browser cannot attach those credentials cross-origin).
//! But cookie-based sessions (and any future cookie-auth flow) ARE vulnerable
//! to CSRF: a malicious page can trigger a cross-site request that automatically
//! carries the victim's session cookie. This module provides the defence.
//!
//! Design: a *double-submit* token.
//!   * `CsrfProtector::issue()` returns a token `value.signature`, where
//!     `signature = HMAC-SHA256(value, CSRF_SECRET)`. Stateless — the server
//!     stores nothing; authenticity is proven by the signature.
//!   * The server sets the token in a `csrf_token` cookie (NOT HttpOnly, so the
//!     SPA can read it) and also returns it in the `X-CSRF-Token` response header.
//!   * On every state-changing request the client MUST echo the token in the
//!     `X-CSRF-Token` header. The `csrf_double_submit` middleware enforces that
//!     the header token is present, the cookie token is present, the two are
//!     equal (constant-time), and the header token's signature is valid
//!     (`protector.verify`). A cross-site attacker cannot read the cookie and
//!     therefore cannot place the matching value in the header, so the request
//!     is rejected.
//!
//! Header-auth (Bearer / X-API-Key) requests are exempt: the browser cannot
//! attach those cross-origin, so double-submit would be meaningless and would
//! only break legitimate API clients.
use base64::engine::general_purpose::URL_SAFE;
use base64::Engine;
use generic_array::typenum::U64;
use generic_array::GenericArray;
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;

pub const CSRF_COOKIE_NAME: &str = "csrf_token";
pub const CSRF_HEADER_NAME: &str = "x-csrf-token";

type HmacSha256 = Hmac<Sha256>;

/// Issues and verifies stateless HMAC-signed CSRF tokens.
#[derive(Clone)]
pub struct CsrfProtector {
    /// HMAC key padded to the SHA-256 block size (64 bytes) once at
    /// construction, so signing/verifying is infallible (`Hmac::new` takes a
    /// fixed-size `GenericArray` and never fails for a correctly-sized key).
    key: GenericArray<u8, U64>,
}

impl CsrfProtector {
    /// Build from a 32-byte raw secret. The secret is zero-padded to the
    /// 64-byte HMAC block size, matching what `Hmac::new_from_slice` does
    /// internally, so the padded key is cryptographically identical.
    pub fn new(secret: [u8; 32]) -> Self {
        let mut padded = [0u8; 64];
        padded[..32].copy_from_slice(&secret);
        Self {
            key: *GenericArray::from_slice(&padded),
        }
    }

    /// Build from `CSRF_SECRET` (base64, 32 bytes). Required config; returns
    /// an error (instead of panicking) so `main` can surface it cleanly.
    pub fn from_env() -> anyhow::Result<Self> {
        let raw = std::env::var("CSRF_SECRET")
            .map_err(|_| anyhow::anyhow!("CSRF_SECRET must be set (32 bytes, base64)"))?;
        let bytes = URL_SAFE
            .decode(raw.trim())
            .map_err(|_| anyhow::anyhow!("CSRF_SECRET must be valid base64"))?;
        let secret: [u8; 32] = bytes
            .try_into()
            .map_err(|_| anyhow::anyhow!("CSRF_SECRET must be 32 bytes"))?;
        Ok(Self::new(secret))
    }

    /// Mint a new signed token `value.signature` (both base64url, no pad).
    pub fn issue(&self) -> String {
        let mut value = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut value);
        let sig = self.sign(&value);
        format!("{}.{}", URL_SAFE.encode(value), URL_SAFE.encode(sig))
    }

    fn sign(&self, value: &[u8]) -> Vec<u8> {
        let mut mac = HmacSha256::new(&self.key);
        mac.update(value);
        mac.finalize().into_bytes().to_vec()
    }

    /// Verify a token's signature. Constant-time via `Mac::verify_slice`.
    pub fn verify(&self, token: &str) -> bool {
        let (value_b64, sig_b64) = match token.split_once('.') {
            Some(pair) => pair,
            None => return false,
        };
        let value = match URL_SAFE.decode(value_b64) {
            Ok(v) => v,
            Err(_) => return false,
        };
        let sig = match URL_SAFE.decode(sig_b64) {
            Ok(s) => s,
            Err(_) => return false,
        };
        // Recompute HMAC(value) and verify against the supplied signature using
        // the constant-time compare built into the MAC.
        let mut mac = HmacSha256::new(&self.key);
        mac.update(&value);
        mac.verify_slice(&sig).is_ok()
    }
}

/// Constant-time string comparison (for the double-submit equality check).
pub fn ct_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

/// Extract a named cookie value from the `Cookie` header.
pub fn cookie_value(headers: &axum::http::HeaderMap, name: &str) -> Option<String> {
    let cookie = headers.get(axum::http::header::COOKIE)?.to_str().ok()?;
    for part in cookie.split(';') {
        let part = part.trim();
        if let Some((k, v)) = part.split_once('=')
            && k.trim() == name
        {
            return Some(v.trim().to_string());
        }
    }
    None
}

/// Double-submit verification: header token present, cookie token present,
/// they are equal (constant-time), and the header token's signature is valid.
pub fn verify_double_submit(
    headers: &axum::http::HeaderMap,
    protector: &CsrfProtector,
) -> bool {
    let cookie_tok = cookie_value(headers, CSRF_COOKIE_NAME);
    let header_tok = headers
        .get(CSRF_HEADER_NAME)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    match (cookie_tok, header_tok) {
        (Some(cookie), Some(header)) => {
            ct_eq(&cookie, &header) && protector.verify(&header)
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn protector() -> CsrfProtector {
        CsrfProtector::new([3u8; 32])
    }

    #[test]
    fn issue_then_verify_roundtrip() {
        let p = protector();
        let tok = p.issue();
        assert!(p.verify(&tok), "issued token must verify");
        assert!(!p.verify("not.a.token"), "malformed token rejected");
        assert!(!p.verify(""), "empty token rejected");
        assert!(!p.verify("AAAA.BBBB"), "garbage signature rejected");
    }

    #[test]
    fn forged_value_with_wrong_signature_rejected() {
        let p = protector();
        let mut value = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut value);
        let forged = format!("{}.{}", URL_SAFE.encode(value), URL_SAFE.encode([9u8; 32]));
        assert!(!p.verify(&forged), "token with wrong signature must fail");
    }

    #[test]
    fn double_submit_requires_header_and_cookie_equal_and_valid() {
        use axum::http::HeaderMap;
        use axum::http::header::{COOKIE, HeaderValue};
        let p = protector();
        let tok = p.issue();

        let mut ok = HeaderMap::new();
        ok.insert(CSRF_HEADER_NAME, HeaderValue::from_str(&tok).unwrap());
        ok.insert(
            COOKIE,
            HeaderValue::from_str(&format!("{CSRF_COOKIE_NAME}={tok}")).unwrap(),
        );
        assert!(
            verify_double_submit(&ok, &p),
            "valid double-submit must pass"
        );

        // Header present but cookie missing -> fail.
        let mut no_cookie = HeaderMap::new();
        no_cookie.insert(CSRF_HEADER_NAME, HeaderValue::from_str(&tok).unwrap());
        assert!(!verify_double_submit(&no_cookie, &p));

        // Cookie present but header missing -> fail.
        let mut no_header = HeaderMap::new();
        no_header.insert(
            COOKIE,
            HeaderValue::from_str(&format!("{CSRF_COOKIE_NAME}={tok}")).unwrap(),
        );
        assert!(!verify_double_submit(&no_header, &p));

        // Mismatched cookie value -> fail.
        let mut mismatched = HeaderMap::new();
        mismatched.insert(CSRF_HEADER_NAME, HeaderValue::from_str(&tok).unwrap());
        mismatched.insert(
            COOKIE,
            HeaderValue::from_str(&format!("{CSRF_COOKIE_NAME}={}", p.issue())).unwrap(),
        );
        assert!(!verify_double_submit(&mismatched, &p));

        // Tampered header (valid token but different from cookie) -> fail.
        let mut tampered = HeaderMap::new();
        tampered.insert(CSRF_HEADER_NAME, HeaderValue::from_str(&p.issue()).unwrap());
        tampered.insert(
            COOKIE,
            HeaderValue::from_str(&format!("{CSRF_COOKIE_NAME}={tok}")).unwrap(),
        );
        assert!(!verify_double_submit(&tampered, &p));
    }
}
