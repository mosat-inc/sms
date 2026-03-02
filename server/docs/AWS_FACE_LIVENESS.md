# AWS Rekognition Face Liveness

## Required IAM Permissions

Attach the following policy statements to the IAM principal used by this backend:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RekognitionFaceLiveness",
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateFaceLivenessSession",
        "rekognition:GetFaceLivenessSessionResults"
      ],
      "Resource": "*"
    }
  ]
}
```

If you configure Rekognition to write audit artifacts to S3/KMS in the future, add matching `s3:*` and `kms:*` permissions for those resources.

## Required Environment Variables

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=... # optional
AWS_REKOGNITION_LIVENESS_THRESHOLD=80
AWS_REKOGNITION_LIVENESS_EXPIRES_SECONDS=180
```

`AWS_REKOGNITION_LIVENESS_THRESHOLD` is the minimum confidence (0-100) treated as pass.
