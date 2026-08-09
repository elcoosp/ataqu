#![allow(clippy::collapsible_if)]
use base32::{Alphabet, decode};
use hmac::{Hmac, Mac};
use sha1::Sha1;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha1 = Hmac<Sha1>;

pub fn generate_secret() -> String {
    use rand::RngCore;
    let mut bytes = [0u8; 20];
    rand::thread_rng().fill_bytes(&mut bytes);
    base32::encode(Alphabet::Rfc4648 { padding: false }, &bytes)
}

pub fn generate_otpauth_url(secret: &str, email: &str) -> String {
    format!(
        "otpauth://totp/Ataqu:{}?secret={}&issuer=Ataqu&algorithm=SHA1&digits=6&period=30",
        email, secret
    )
}

pub fn verify_totp(secret: &str, code: &str) -> bool {
    let decoded = match decode(Alphabet::Rfc4648 { padding: false }, secret) {
        Some(bytes) => bytes,
        None => return false,
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let time_step = 30u64;
    let current_step = now / time_step;

    for offset in -1i64..=1 {
        let step = (current_step as i64 + offset) as u64;
        if let Ok(expected) = generate_totp_code(&decoded, step)
            && constant_time_eq(code.as_bytes(), format!("{:06}", expected).as_bytes())
        {
            return true;
        }
    }
    false
}

fn generate_totp_code(key: &[u8], counter: u64) -> Result<u32, &'static str> {
    let mut mac = HmacSha1::new_from_slice(key).map_err(|_| "Invalid key")?;
    mac.update(&counter.to_be_bytes());
    let hash = mac.finalize().into_bytes();

    let offset = (hash[hash.len() - 1] & 0x0f) as usize;
    let truncated = u32::from_be_bytes([
        hash[offset] & 0x7f,
        hash[offset + 1],
        hash[offset + 2],
        hash[offset + 3],
    ]);

    Ok(truncated % 1_000_000)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}
