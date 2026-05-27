# Media CDN Specification

## Purpose

Persistent storage and serving of WhatsApp media (images, videos, audio, documents) using MinIO or S3-compatible storage.

## Requirements

### Requirement: Media Download on Ingestion

When a WhatsApp message with media type (image/video/audio/document) is received, the system MUST download the media from WhatsApp's CDN, upload it to persistent storage, and store the permanent URL.

#### Scenario: Image message is received

- GIVEN a WhatsApp message with image type
- WHEN the message is processed by MessageHandlerService
- THEN the media MUST be downloaded from WhatsApp's temporary URL
- AND the media MUST be uploaded to the configured storage provider
- AND the `media_url` in the message record MUST be updated to the permanent storage URL

#### Scenario: Video message fails to download

- GIVEN a WhatsApp message with video type
- WHEN the download from WhatsApp fails (timeout/network error)
- THEN the message MUST still be saved with `media_url: null`
- AND the download MUST be retried up to 3 times with exponential backoff

### Requirement: Storage Abstraction

The system MUST support configurable storage backends: MinIO (local/self-hosted) and S3 (AWS/Cloudflare R2). The backend MUST be selectable via environment variable.

#### Scenario: Using MinIO backend

- GIVEN `STORAGE_PROVIDER=minio` with MinIO credentials configured
- WHEN media is uploaded
- THEN the file MUST be stored in the configured MinIO bucket
- AND a signed URL MUST be generated for secure access

#### Scenario: Using S3 backend

- GIVEN `STORAGE_PROVIDER=s3` with AWS credentials configured
- WHEN media is uploaded
- THEN the file MUST be stored in the configured S3 bucket
- AND a pre-signed URL MUST be generated with configurable expiration

### Requirement: Thumbnail Generation

For image and video media, the system SHOULD generate and store a thumbnail alongside the original.

#### Scenario: Image with thumbnail

- GIVEN an uploaded image (JPEG/PNG/WebP)
- WHEN the upload completes
- THEN a thumbnail MUST be generated at 320x320px max
- AND the thumbnail MUST be stored with a `thumb-` prefix key

#### Scenario: Video with thumbnail

- GIVEN an uploaded video (MP4)
- WHEN the upload completes
- THEN a thumbnail SHOULD be extracted from the video's midpoint
- AND stored as a JPEG at 320x320px max

### Requirement: Media Serving

Media MUST be served via signed/authorized URLs. Direct bucket access MUST be blocked.

#### Scenario: Authenticated user requests media

- GIVEN an authenticated user session
- WHEN the user requests `GET /api/media/:id`
- THEN a signed URL MUST be returned (or a redirect to the signed URL)
- AND the URL MUST expire after 1 hour

#### Scenario: Unauthenticated request

- GIVEN no authentication token
- WHEN a request is made to `GET /api/media/:id`
- THEN a 401 Unauthorized MUST be returned

### Requirement: Media Entity

The system MUST store media metadata in a `media` table linking back to the message.

#### Scenario: Media record created

- GIVEN a successfully uploaded media file
- WHEN the upload completes
- THEN a media record MUST be created with: message_id, session_id, storage_key, mime_type, file_size, thumbnail_key, dimensions
