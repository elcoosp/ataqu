pub struct S3Service {
    bucket: String,
}

impl S3Service {
    pub async fn new(bucket: String) -> Self {
        Self { bucket }
    }

    pub fn bucket(&self) -> &str {
        &self.bucket
    }
}
