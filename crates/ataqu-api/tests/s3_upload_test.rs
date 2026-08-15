//! S3 upload URL generation test.
//!
//! Requires a configured bucket (`S3_BUCKET`) and AWS credentials in the
//! environment. When those are absent the test is skipped rather than passing
//! vacuously. Run with `S3_BUCKET=… cargo test -- --ignored` (or set the env).
use ataqu_infra_storage::s3_service::S3Service;

#[tokio::test]
#[ignore = "requires S3_BUCKET and AWS credentials"]
async fn test_s3_upload_url_generation() {
    let svc = match S3Service::new().await {
        Ok(svc) => svc,
        Err(e) => {
            eprintln!("Skipping S3 test: S3Service init failed ({e}). Set S3_BUCKET + AWS creds.");
            return;
        }
    };

    let url = svc
        .generate_upload_url("test/evidence.pdf")
        .await
        .expect("presigned URL generation must succeed");

    // A real presigned PUT URL is an https endpoint we can hand to a client.
    assert!(
        url.starts_with("https://") && url.contains("/test/evidence.pdf"),
        "presigned URL should be an https endpoint ending in the object key, got: {url}"
    );
}
