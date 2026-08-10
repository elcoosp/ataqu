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
    #[error("Invalid bucket configuration")]
    InvalidBucket,
}

pub type Result<T> = std::result::Result<T, S3Error>;

#[derive(Clone)]
pub struct S3Service {
    client: Client,
    bucket: String,
    region: String,
}

impl S3Service {
    pub async fn new() -> Result<Self> {
        let bucket = std::env::var("S3_BUCKET").map_err(|_| S3Error::InvalidBucket)?;
        let region = std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());

        let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
        let client = Client::new(&config);

        info!(bucket = %bucket, region = %region, "S3Service initialized");

        Ok(S3Service {
            client,
            bucket,
            region,
        })
    }

    pub async fn generate_upload_url(&self, key: &str) -> Result<String> {
        let object_key = key.strip_prefix('/').unwrap_or(key);
        let presign_config = PresigningConfig::builder()
            .expires_in(Duration::from_secs(3600))
            .build()
            .map_err(|e| S3Error::Presign(e.to_string()))?;

        let presigned = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(object_key)
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
            let mut req = self.client.list_objects_v2()
                .bucket(&self.bucket)
                .prefix(prefix)
                .max_keys(1000);
            if let Some(token) = continuation_token {
                req = req.continuation_token(token);
            }
            let resp = req.send().await
                .map_err(|e| S3Error::Presign(e.to_string()))?;
            // contents() returns a slice of objects
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






    pub async fn delete_object(&self, key: &str) -> Result<()> {
        self.client.delete_object()
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
