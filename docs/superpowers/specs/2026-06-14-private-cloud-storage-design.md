# Private Cloud Storage Design

## Goal

Move all administrator-managed operational content from browser-local or
ephemeral storage to durable shared storage without changing the existing
teacher/admin UI or its workflows.

The migrated content includes:

- Teacher and student profile photos
- Weekly kindergarten photos
- Schedule images
- Foundation PDFs
- Notices
- Lesson video metadata

Files must remain available after Vercel domain changes, browser changes, and
Cloud Run restarts. Kindergarten photos and PDFs must only be available to
authenticated teachers and administrators.

## Current Problems

- Weekly photos, schedule images, foundation PDFs, notices, and lesson videos
  are stored in browser `localStorage`. They are scoped to one browser origin,
  so another device or a changed Vercel domain cannot see them.
- Profile file metadata is stored in Oracle, but the actual profile files are
  stored in Cloud Run's `/tmp/uploads`. Cloud Run's filesystem is ephemeral,
  so files disappear when the instance is replaced or scales to zero.
- Data URLs stored in `localStorage` have small browser quotas and are not
  suitable for shared production content.

## Chosen Architecture

Use a private Google Cloud Storage bucket for file bytes and Oracle Database
for durable metadata. Keep all existing frontend screens and user workflows.

The bucket is not public. After authenticating a request, the backend generates
a short-lived signed read URL, valid for 15 minutes. The frontend uses the
signed URL in its existing image and PDF viewers.

This approach was chosen over:

- Backend file proxying, because routing every image byte through Cloud Run
  increases backend load and cost.
- Public object URLs, because kindergarten photos and PDFs must not be exposed
  to anyone who obtains a permanent URL.

## Data Model

### Stored File

A shared file metadata model records:

- `id`
- `objectKey`: private Cloud Storage object name
- `originalFileName`
- `contentType`
- `sizeBytes`
- `category`: `PROFILE`, `WEEKLY_PHOTO`, `SCHEDULE_IMAGE`, or
  `FOUNDATION_PDF`
- `createdAt`
- `createdByType`
- `createdById`

The database stores object keys, never signed URLs. Signed URLs expire and
therefore must only be generated in API responses.

### Profile Photos

Existing `Teacher.photoUrl` and `Student.photoUrl` fields will store a stable
file reference rather than a Cloud Run `/uploads/...` URL. Profile API
responses resolve that reference to a fresh signed URL.

### Managed Content

Create durable Oracle entities for:

- Weekly photos: title, stored file reference, creation time, display order
- Schedule images: title, stored file reference, file name, active state,
  creation time
- Foundation materials: title, stored file reference, file name, active state,
  creation time
- Notices: title, content, teacher visibility, creation time
- Lesson videos: lesson number, title, speaker, YouTube URL, active state

Only metadata belongs in Oracle. Actual images and PDFs belong in Cloud
Storage.

## Backend Components

### Storage Service

Introduce a storage service boundary responsible for:

- Validating allowed file types and maximum sizes
- Creating non-guessable object keys grouped by category
- Uploading private objects
- Generating 15-minute signed read URLs
- Deleting replaced or removed objects

The controller layer does not call the Cloud Storage SDK directly.

### Content APIs

Add authenticated APIs for listing content and administrator-only APIs for
creating, deleting, ordering, and activating content.

Teacher read access:

- Active notices
- Weekly photos
- Active schedule image
- Active foundation material and material list
- Lesson video list
- Profile photos belonging to accessible profile responses

Administrator write access:

- Upload and delete files
- Create and delete metadata records
- Set active schedule/foundation records
- Manage notices and lesson videos

Existing profile upload endpoint remains compatible so the frontend workflow
does not change.

### Authorization

- The bucket uses uniform bucket-level access and has no public access.
- The Cloud Run service account receives only the Storage Object User role for
  the application bucket.
- All content APIs require the existing JWT authentication.
- All mutation APIs require an administrator JWT.
- Signed URLs expire after 15 minutes and grant read access only to one object.

## Frontend Changes

Replace `localStorage` reads and writes with API calls while keeping current
component layout, controls, labels, and interactions.

- Admin pages load shared data from Oracle-backed APIs.
- Upload buttons send multipart files to the backend.
- Delete and active-state controls call backend mutation APIs.
- Teacher pages load shared content from backend APIs.
- Existing signed image/PDF URLs render through the current viewers.
- Loading, empty, and error states use existing visual patterns.

Browser-local preferences remain local because they are user/device settings:

- Dark mode
- Notice read state
- "Do not show today"
- Notice mute preference
- Current tab preference

## Migration

Existing `localStorage` content cannot be recovered automatically from another
origin. Provide a temporary administrator migration action that reads content
available in the current browser and uploads it through the new APIs.

Migration behavior:

- Only shown when legacy local data exists.
- Imports one category at a time.
- Does not delete legacy local data until the server confirms all imports.
- Is idempotent where practical by checking stable metadata such as title and
  creation time.

Profile files already missing from Cloud Run cannot be recovered from their
Oracle URLs and must be uploaded again.

## Error Handling

- Reject unsupported file formats and oversized files before upload.
- Return clear API errors for upload, metadata, authorization, and deletion
  failures.
- If object upload succeeds but metadata creation fails, delete the uploaded
  object.
- If metadata deletion succeeds but object deletion fails, log the orphan for
  later cleanup without restoring deleted UI content.
- If a signed URL expires while a screen remains open, a refresh reloads fresh
  signed URLs.

## Testing

### Backend

- Storage service object-key, validation, upload, delete, and signed-URL tests
- Content service CRUD and active-state tests
- Controller authorization tests for teacher/admin access
- Transaction and cleanup tests for partial upload failures
- Compatibility test for the existing profile upload response shape

### Frontend

- API client request and response mapping tests where supported
- Admin upload/delete/activation flows
- Teacher shared-content loading and empty/error behavior
- Legacy migration success and failure behavior

### Deployment Verification

- Upload each supported content type from the administrator page
- Confirm a different browser/device sees the same content
- Confirm unauthenticated content API requests are rejected
- Confirm direct bucket access is denied
- Confirm signed links work and expire
- Restart or redeploy Cloud Run and confirm all content remains available

## Deployment

1. Create one private regional Cloud Storage bucket in Seoul.
2. Enable uniform bucket-level access and public access prevention.
3. Grant the Cloud Run service account Storage Object User on that bucket.
4. Add the bucket name and signed URL lifetime as Cloud Run environment
   variables.
5. Deploy Oracle schema/entity changes and the backend.
6. Deploy the frontend API migration.
7. Run the legacy local-data migration from any browser that still contains
   recoverable content.

## Operational Notes

- Signed URLs are temporary; they must never be persisted in Oracle.
- Cloud Storage and Oracle become the source of truth.
- Cloud Run `/tmp` is used only for temporary processing, never durable files.
- Bucket lifecycle rules may be added later for orphan cleanup, but no
  automatic deletion rule is enabled initially.
