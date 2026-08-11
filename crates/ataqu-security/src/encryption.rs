use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, OsRng},
};
use base64::Engine;
use rand::RngCore;

#[derive(Clone)]
pub struct Encryptor {
    key: [u8; 32],
}

impl Encryptor {
    pub fn from_env() -> Self {
        let key_env =
            std::env::var("ENCRYPTION_KEY").expect("ENCRYPTION_KEY must be set (32 bytes, base64)");
        let key_bytes = base64::engine::general_purpose::STANDARD
            .decode(&key_env)
            .expect("ENCRYPTION_KEY must be valid base64");
        let key: [u8; 32] = key_bytes
            .try_into()
            .expect("ENCRYPTION_KEY must be 32 bytes");
        Self { key }
    }

    pub fn encrypt(&self, plaintext: &str) -> String {
        let cipher = Aes256Gcm::new_from_slice(&self.key).unwrap();
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes()).unwrap();
        let mut combined = Vec::with_capacity(12 + ciphertext.len());
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ciphertext);
        base64::engine::general_purpose::STANDARD.encode(&combined)
    }

    pub fn decrypt(&self, combined_b64: &str) -> Result<String, String> {
        let combined = base64::engine::general_purpose::STANDARD
            .decode(combined_b64)
            .map_err(|e| format!("Base64 decoding failed: {}", e))?;
        if combined.len() < 12 {
            return Err("Ciphertext too short".to_string());
        }
        let nonce_bytes = &combined[0..12];
        let ciphertext = &combined[12..];
        let cipher =
            Aes256Gcm::new_from_slice(&self.key).map_err(|e| format!("Invalid key: {}", e))?;
        let nonce = Nonce::from_slice(nonce_bytes);
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;
        String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_roundtrip() {
        let key = [0u8; 32];
        let encryptor = Encryptor { key };
        let plaintext = "secret_token";
        let encrypted = encryptor.encrypt(plaintext);
        let decrypted = encryptor.decrypt(&encrypted).unwrap();
        assert_eq!(plaintext, decrypted);
    }
}
