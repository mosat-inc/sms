# Cloudflare R2 CORS For Materials

Use this when the React frontend uploads directly to R2 with presigned `PUT` URLs and later views files from the R2 custom domain.

Suggested CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "https://your-frontend-domain.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Operational notes:

- Keep the bucket private if materials require app authentication.
- Serve views/downloads with short-lived presigned `GET` URLs from the backend.
- If you later move to a fully public materials library, point `R2_PUBLIC_BASE_URL` at a Cloudflare custom domain in front of the bucket.
- For video playback, make sure the custom domain preserves `Range` requests so browsers can stream instead of downloading the whole file.
