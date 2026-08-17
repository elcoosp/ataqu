use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, OsRng},
};
use base64::Engine;
use rand::RngCore;

/// Number of bytes of the AES-GCM nonce (96 bits, per NIST SP 800-38D).
const NONCE_LEN: usize = 12;
/// Leading byte in a versioned ciphertext identifying which key encrypted it.
const VERSION_LEN: usize = 1;

/// AES-256-GCM field encryptor with support for **key rotation**.
///
/// The encryptor holds an ordered keyring: `keys[0]` is the *primary* key used
/// for all new encryptions; additional entries are *historical* keys retained
/// so that ciphertexts produced before a rotation can still be decrypted.
///
/// Ciphertext wire format (base64): `[version: 1][nonce: 12][ciphertext]`.
/// `version` is the index of the key that produced it. On decrypt we select
/// the key by version, so rotating `ENCRYPTION_KEY` does not invalidate
/// existing data. `re_encrypt` upgrades a stored value to the primary key.
///
/// Legacy (pre-rotation) ciphertexts that have no version byte are still
/// accepted: `decrypt` first tries the versioned parse and, if it does not
/// authenticate, falls back to the legacy `nonce || ciphertext` layout using
/// the primary key. This keeps data encrypted before this change readable.
pub struct Encryptor {
    keys: Vec<[u8; 32]>,
}

impl Encryptor {
    /// Build a keyring from the environment.
    ///
    /// `ENCRYPTION_KEY` (required) is the primary key. `ENCRYPTION_KEY_PREV`
    /// (optional, base64) is the previous key, retained so existing ciphertexts
    /// remain decryptable after a rotation. To rotate: set `ENCRYPTION_KEY_PREV`
    /// to the current key, then change `ENCRYPTION_KEY` to the new key.
    ///
    /// Returns an error (instead of panicking) when a key is missing or
    /// malformed, so the caller can surface it as a startup failure.
    pub fn from_env() -> Result<Self, String> {
        let primary = Self::key_from_env("ENCRYPTION_KEY")?;
        let mut keys = vec![primary];
        if let Ok(prev_b64) = std::env::var("ENCRYPTION_KEY_PREV")
            && !prev_b64.trim().is_empty()
        {
            keys.push(Self::decode_key(&prev_b64)?);
        }
        Ok(Self { keys })
    }

    /// Build directly from explicit keys (primary first). Exposed for tests and
    /// callers that source keys from a secret manager rather than env.
    pub fn new(keys: Vec<[u8; 32]>) -> Self {
        assert!(!keys.is_empty(), "Encryptor requires at least one key");
        Self { keys }
    }

    fn key_from_env(var: &str) -> Result<[u8; 32], String> {
        let raw = std::env::var(var)
            .map_err(|_| format!("{var} must be set (32 bytes, base64)"))?;
        Self::decode_key(&raw)
    }

    fn decode_key(b64: &str) -> Result<[u8; 32], String> {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(b64.trim())
            .map_err(|_| "ENCRYPTION_KEY must be valid base64".to_string())?;
        bytes
            .try_into()
            .map_err(|_| "ENCRYPTION_KEY must be 32 bytes".to_string())
    }

    /// Encrypt `plaintext` with the primary key, embedding its version.
    pub fn encrypt(&self, plaintext: &str) -> String {
        let cipher = Aes256Gcm::new_from_slice(&self.keys[0]).unwrap();
        let mut nonce_bytes = [0u8; NONCE_LEN];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes()).unwrap();

        let mut combined =
            Vec::with_capacity(VERSION_LEN + NONCE_LEN + ciphertext.len());
        combined.push(0u8); // version of the primary key
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ciphertext);
        base64::engine::general_purpose::STANDARD.encode(&combined)
    }

    /// Decrypt a value produced by `encrypt`, or a legacy (no-version) value.
    pub fn decrypt(&self, combined_b64: &str) -> Result<String, String> {
        let combined = base64::engine::general_purpose::STANDARD
            .decode(combined_b64)
            .map_err(|e| format!("Base64 decoding failed: {e}"))?;

        // Try the versioned layout first.
        if combined.len() > VERSION_LEN + NONCE_LEN {
            let version = combined[0] as usize;
            if version < self.keys.len()
                && let Ok(pt) = self.decrypt_with(version, &combined[VERSION_LEN..]) {
                    return Ok(pt);
                }
        }

        // Fall back to the legacy `nonce || ciphertext` layout (primary key).
        if combined.len() >= NONCE_LEN
            && let Ok(pt) = self.decrypt_with(0, &combined) {
                return Ok(pt);
            }

        Err("Decryption failed".to_string())
    }

    fn decrypt_with(&self, version: usize, body: &[u8]) -> Result<String, String> {
        if body.len() < NONCE_LEN {
            return Err("Ciphertext too short".to_string());
        }
        let nonce = Nonce::from_slice(&body[..NONCE_LEN]);
        let ciphertext = &body[NONCE_LEN..];
        let cipher = Aes256Gcm::new_from_slice(&self.keys[version])
            .map_err(|e| format!("Invalid key: {e}"))?;
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Decryption failed".to_string())?;
        String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {e}"))
    }

    /// Upgrade a stored value to the primary key. Returns `None` if the value
    /// cannot be decrypted (wrong/unknown key or corrupt data). Callers that
    /// own the encrypted-at-rest records can use this during a key rotation to
    /// re-write them under the latest key, after which `ENCRYPTION_KEY_PREV`
    /// can eventually be dropped.
    pub fn re_encrypt(&self, combined_b64: &str) -> Option<String> {
        let plaintext = self.decrypt(combined_b64).ok()?;
        Some(self.encrypt(&plaintext))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use aes_gcm::aead::Aead;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let enc = Encryptor::new(vec![[7u8; 32]]);
        let ct = enc.encrypt("secret_token");
        assert_eq!(enc.decrypt(&ct).unwrap(), "secret_token");
    }

    #[test]
    fn legacy_ciphertext_without_version_still_decrypts() {
        // Simulate a pre-rotation payload: raw nonce || ciphertext, base64.
        let key = [9u8; 32];
        let legacy = {
            let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
            let mut nonce = [0u8; 12];
            OsRng.fill_bytes(&mut nonce);
            let ct = cipher
                .encrypt(Nonce::from_slice(&nonce), b"legacy_secret".as_slice())
                .unwrap();
            let mut buf = Vec::with_capacity(12 + ct.len());
            buf.extend_from_slice(&nonce);
            buf.extend_from_slice(&ct);
            base64::engine::general_purpose::STANDARD.encode(&buf)
        };
        let enc = Encryptor::new(vec![key]);
        assert_eq!(enc.decrypt(&legacy).unwrap(), "legacy_secret");
    }

    #[test]
    fn rotation_keeps_old_ciphertext_decryptable() {
        let old_key = [1u8; 32];
        let new_key = [2u8; 32];
        // Old ciphertext under the previous key.
        let old_ct = {
            let cipher = Aes256Gcm::new_from_slice(&old_key).unwrap();
            let mut nonce = [0u8; 12];
            OsRng.fill_bytes(&mut nonce);
            let ct = cipher
                .encrypt(Nonce::from_slice(&nonce), b"rotate_me".as_slice())
                .unwrap();
            let mut buf = vec![1u8]; // version 1 = previous key
            buf.extend_from_slice(&nonce);
            buf.extend_from_slice(&ct);
            base64::engine::general_purpose::STANDARD.encode(&buf)
        };
        // Keyring with new primary (index 0) and old key (index 1).
        let enc = Encryptor::new(vec![new_key, old_key]);
        assert_eq!(enc.decrypt(&old_ct).unwrap(), "rotate_me");
        // New encryptions use the primary and still round-trip.
        let fresh = enc.encrypt("fresh");
        assert_eq!(enc.decrypt(&fresh).unwrap(), "fresh");
        // re_encrypt upgrades the old value to the primary key.
        let upgraded = enc.re_encrypt(&old_ct).unwrap();
        assert_eq!(enc.decrypt(&upgraded).unwrap(), "rotate_me");
    }
}
