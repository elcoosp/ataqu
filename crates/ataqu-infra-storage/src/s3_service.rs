use aws_config::BehaviorVersion;
use aws_sdk_s3::Client;
use aws_sdk_s3::presigning::PresigningConfig;
use std::time::Duration;
use thiserror::Error;
use tracing::info;

#[derive(Error, Debug)]
pub enum S3Error {
    #[error("S3 client initialization failed: {0}")]
    Init(String),
    #[error("Presigned URL generation failed: {0}")]
    Presign(String),
    #[error("S3 list failed: {0}")]
    List(String),
    #[error("Invalid bucket configuration")]
    InvalidBucket,
}

pub type Result<T> = std::result::Result<T, S3Error>;

#[derive(Clone)]
pub struct S3Service {
    client: Client,
    bucket: String,
    _region: String,
}

pub struct ListObjectsResult {
    pub keys: Vec<String>,
    pub next_continuation_token: Option<String>,
}

impl S3Service {
    pub async fn new() -> Result<Self> {
        let bucket = std::env::var("S3_BUCKET").map_err(|_| S3Error::InvalidBucket)?;
        let region = std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());

        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let force_path_style = std::env::var("S3_FORCE_PATH_STYLE")
            .map(|v| v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);
        let s3_config = aws_sdk_s3::config::Builder::from(&config)
            .force_path_style(force_path_style)
            .build();
        let client = Client::from_conf(s3_config);

        info!(bucket = %bucket, region = %region, "S3Service initialized");

        Ok(S3Service {
            client,
            bucket,
            _region: region,
        })
    }

    /// Generate a presigned PUT URL.
    ///
    /// HARDENING (fixed in audit): the key shape is validated before signing
    /// (`<domain>/<uuid>/<uuid>/<uuid>` — no traversal, no arbitrary
    /// tenant-controlled paths), so the service cannot be talked into handing
    /// out upload URLs for attacker-chosen object keys.
    pub async fn generate_upload_url(&self, key: &str) -> Result<String> {
        let object_key = key.strip_prefix('/').unwrap_or(key);
        validate_object_key(object_key).map_err(S3Error::Presign)?;
        let presign_config = PresigningConfig::builder()
            .expires_in(Duration::from_secs(3600))
            .build()
            .map_err(|e| S3Error::Presign(e.to_string()))?;

        let presigned = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(object_key)
            // Pin the content type so a holder of the URL cannot upload an
            // arbitrary type under this key within the expiry window.
            .content_type("application/octet-stream")
            .presigned(presign_config)
            .await
            .map_err(|e| S3Error::Presign(e.to_string()))?;

        let url = presigned.uri().to_string();
        Ok(url)
    }

    pub async fn list_objects(&self, prefix: &str) -> Result<Vec<String>> {
        let mut objects = Vec::new();
        let mut continuation_token = None;
        loop {
            let mut req = self
                .client
                .list_objects_v2()
                .bucket(&self.bucket)
                .prefix(prefix)
                .max_keys(1000);
            if let Some(token) = continuation_token {
                req = req.continuation_token(token);
            }
            let resp = req
                .send()
                .await
                .map_err(|e| S3Error::List(format!("{e:?}")))?;
            for obj in resp.contents() {
                if let Some(key) = obj.key() {
                    objects.push(key.to_string());
                }
            }
            if let Some(token) = resp.next_continuation_token() {
                continuation_token = Some(token.to_string());
            } else {
                break;
            }
        }
        Ok(objects)
    }

    pub async fn list_objects_with_token(
        &self,
        prefix: &str,
        continuation_token: Option<&str>,
    ) -> Result<ListObjectsResult> {
        let mut req = self
            .client
            .list_objects_v2()
            .bucket(&self.bucket)
            .prefix(prefix)
            .max_keys(1000);
        if let Some(token) = continuation_token {
            req = req.continuation_token(token);
        }
        let resp = req
            .send()
            .await
            .map_err(|e| S3Error::List(format!("{e:?}")))?;
        let mut keys = Vec::new();
        for obj in resp.contents() {
            if let Some(key) = obj.key() {
                keys.push(key.to_string());
            }
        }
        let next_token = resp.next_continuation_token().map(|t| t.to_string());
        Ok(ListObjectsResult {
            keys,
            next_continuation_token: next_token,
        })
    }

    pub async fn delete_object(&self, key: &str) -> Result<()> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| S3Error::Presign(e.to_string()))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requires real AWS credentials"]
    async fn test_generate_upload_url() {
        let svc = S3Service::new().await.unwrap();
        let url = svc.generate_upload_url("test/file.txt").await.unwrap();
        assert!(url.starts_with("https://"));
    }
}

/// Validate an S3 object key used for uploads: `<domain>/<uuid>/<uuid>/<uuid>`
/// segments, no traversal, no whitespace. The existing callers (dial file
/// uploads, pause documents) construct keys exactly this way from
/// server-generated UUIDs.
pub fn validate_object_key(key: &str) -> std::result::Result<(), String> {
    let segments: Vec<&str> = key.split('/').collect();
    if segments.len() != 4 {
        return Err(format!("invalid object key shape: {key:?}"));
    }
    for seg in &segments {
        if seg.is_empty()
            || *seg == "."
            || *seg == ".."
            || seg.contains(char::is_whitespace)
            || seg.len() > 100
        {
            return Err(format!("invalid object key segment in {key:?}"));
        }
    }
    // First segment is the app domain (dial, pause, ...), rest are UUIDs.
    for seg in &segments[1..] {
        if seg.parse::<uuid::Uuid>().is_err() {
            return Err(format!("object key segments must be UUIDs: {key:?}"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod key_tests {
    use super::validate_object_key;

    #[test]
    fn accepts_server_shaped_keys() {
        let u = uuid::Uuid::new_v4();
        let key = format!("dial/{u}/{u}/{u}");
        assert!(validate_object_key(&key).is_ok());
    }

    #[test]
    fn rejects_traversal_and_foreign_shapes() {
        assert!(validate_object_key("../../etc/passwd").is_err());
        assert!(validate_object_key("dial/../../secret").is_err());
        assert!(validate_object_key("dial/not-a-uuid/not-a-uuid/x").is_err());
        assert!(validate_object_key("only/2").is_err());
        assert!(validate_object_key("").is_err());
    }
}
