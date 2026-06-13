# Private Cloud Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist all administrator-managed files and shared content in private Google Cloud Storage and Oracle Database while preserving the existing frontend UI and workflows.

**Architecture:** A focused `PrivateFileStorage` boundary owns object validation, upload, deletion, and short-lived signed read URLs. Oracle entities store durable file references and shared-content metadata. Existing React components switch from origin-scoped `localStorage` to authenticated REST APIs, while browser-only preferences remain local.

**Tech Stack:** Java 17, Spring Boot 3.3, Spring Security JWT, Spring Data JPA, Oracle Autonomous Database, Google Cloud Storage Java SDK, Next.js 14, React 18, TypeScript.

---

## File Structure

### Backend

- Create `backend/src/main/java/com/kindergarden/recitation/storage/PrivateFileStorage.java`: provider-independent private file contract.
- Create `backend/src/main/java/com/kindergarden/recitation/storage/GoogleCloudFileStorage.java`: Google Cloud Storage implementation.
- Create `backend/src/main/java/com/kindergarden/recitation/storage/LocalFileStorage.java`: local-development implementation.
- Create `backend/src/main/java/com/kindergarden/recitation/storage/StoredFileCategory.java`: allowed file categories and validation rules.
- Create `backend/src/main/java/com/kindergarden/recitation/entity/StoredFile.java`: durable object metadata.
- Create content entities and repositories for weekly photos, schedule images, foundation materials, notices, and lesson videos.
- Create `backend/src/main/java/com/kindergarden/recitation/service/SharedContentService.java`: transactional content operations and DTO mapping.
- Create `backend/src/main/java/com/kindergarden/recitation/controller/SharedContentController.java`: authenticated reads and administrator mutations.
- Modify `ProfileController`, `RecitationService`, and `AuthService` to resolve stable file references into signed URLs.
- Modify `SecurityConfig`, `application.yml`, and `pom.xml` for private storage.

### Frontend

- Expand `frontend/lib/api.ts`: shared-content types and authenticated endpoints.
- Modify `AdminDashboardView.tsx`: use server APIs for shared content while preserving its UI.
- Modify `StartView.tsx`: load shared teacher content from server APIs.
- Modify `AdminProfileManager.tsx` only where needed to stop relying on photo cache as source of truth.
- Keep legacy `frontend/lib/{weeklyPhotos,scheduleImages,foundationMaterials,notices,lessonVideos}.ts` readers for one-time migration and local preference helpers.

---

### Task 1: Private File Storage Contract and Validation

**Files:**
- Create: `backend/src/main/java/com/kindergarden/recitation/storage/StoredFileCategory.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/storage/PrivateFileStorage.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/storage/StoredObject.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/storage/StoredFileCategoryTest.java`

- [ ] **Step 1: Write the failing category validation test**

```java
class StoredFileCategoryTest {
    @Test
    void acceptsImagesForWeeklyPhotosAndRejectsPdf() {
        assertThat(StoredFileCategory.WEEKLY_PHOTO.accepts("image/jpeg", 1024)).isTrue();
        assertThat(StoredFileCategory.WEEKLY_PHOTO.accepts("application/pdf", 1024)).isFalse();
    }

    @Test
    void acceptsPdfForFoundationAndRejectsOversizedFile() {
        assertThat(StoredFileCategory.FOUNDATION_PDF.accepts("application/pdf", 1024)).isTrue();
        assertThat(StoredFileCategory.FOUNDATION_PDF.accepts("application/pdf", 21L * 1024 * 1024)).isFalse();
    }
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd backend && mvn -Dtest=StoredFileCategoryTest test`

Expected: FAIL because `StoredFileCategory` does not exist.

- [ ] **Step 3: Implement the storage contract**

```java
public enum StoredFileCategory {
    PROFILE(Set.of("image/jpeg", "image/png", "image/webp"), 5L * 1024 * 1024),
    WEEKLY_PHOTO(Set.of("image/jpeg", "image/png", "image/webp"), 10L * 1024 * 1024),
    SCHEDULE_IMAGE(Set.of("image/jpeg", "image/png", "image/webp"), 10L * 1024 * 1024),
    FOUNDATION_PDF(Set.of("application/pdf"), 20L * 1024 * 1024);

    public boolean accepts(String contentType, long size) {
        return contentTypes.contains(contentType) && size > 0 && size <= maxBytes;
    }
}

public interface PrivateFileStorage {
    StoredObject upload(StoredFileCategory category, MultipartFile file);
    URI createReadUri(String objectKey, Duration lifetime);
    void delete(String objectKey);
}

public record StoredObject(String objectKey, String originalFileName, String contentType, long sizeBytes) {}
```

- [ ] **Step 4: Run the storage validation tests**

Run: `cd backend && mvn -Dtest=StoredFileCategoryTest test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/kindergarden/recitation/storage backend/src/test/java/com/kindergarden/recitation/storage
git commit -m "feat: define private file storage contract"
```

### Task 2: Google Cloud and Local Storage Implementations

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/com/kindergarden/recitation/storage/GoogleCloudFileStorage.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/storage/LocalFileStorage.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/storage/LocalFileStorageTest.java`

- [ ] **Step 1: Write a failing local-storage lifecycle test**

```java
@TempDir Path tempDir;

@Test
void uploadsReadsAndDeletesAFile() {
    LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), "http://localhost:8080");
    MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", "photo".getBytes());

    StoredObject stored = storage.upload(StoredFileCategory.PROFILE, file);

    assertThat(Files.exists(tempDir.resolve(stored.objectKey()))).isTrue();
    assertThat(storage.createReadUri(stored.objectKey(), Duration.ofMinutes(15)).toString())
        .startsWith("http://localhost:8080/uploads/");
    storage.delete(stored.objectKey());
    assertThat(Files.exists(tempDir.resolve(stored.objectKey()))).isFalse();
}
```

- [ ] **Step 2: Run the lifecycle test and verify RED**

Run: `cd backend && mvn -Dtest=LocalFileStorageTest test`

Expected: FAIL because `LocalFileStorage` does not exist.

- [ ] **Step 3: Add Google Cloud Storage dependency**

```xml
<dependency>
  <groupId>com.google.cloud</groupId>
  <artifactId>google-cloud-storage</artifactId>
  <version>2.54.0</version>
</dependency>
```

- [ ] **Step 4: Implement local and Cloud Storage adapters**

`LocalFileStorage` stores under the configured development directory. `GoogleCloudFileStorage` uses application-default credentials, uploads objects with generated keys shaped as `<category>/<uuid>.<extension>`, sets content type, deletes by key, and generates V4 signed URLs:

```java
URL signed = storage.signUrl(
    BlobInfo.newBuilder(bucketName, objectKey).build(),
    lifetime.toMinutes(),
    TimeUnit.MINUTES,
    Storage.SignUrlOption.withV4Signature()
);
```

Activate local storage with `@Profile("!gcp")` and Cloud Storage with `@Profile("gcp")`.

- [ ] **Step 5: Run the lifecycle test and full backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/src/main/java/com/kindergarden/recitation/storage backend/src/test/java/com/kindergarden/recitation/storage
git commit -m "feat: add local and cloud private storage"
```

### Task 3: Stored File Metadata and Shared Content Entities

**Files:**
- Create: `backend/src/main/java/com/kindergarden/recitation/entity/StoredFile.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/entity/WeeklyPhoto.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/entity/ScheduleImage.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/entity/FoundationMaterial.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/entity/Notice.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/entity/LessonVideo.java`
- Create matching repositories under `backend/src/main/java/com/kindergarden/recitation/repository/`
- Test: `backend/src/test/java/com/kindergarden/recitation/repository/SharedContentRepositoryTest.java`

- [ ] **Step 1: Write a failing repository ordering and activation test**

Use `@DataJpaTest` with test entities to assert:

```java
assertThat(weeklyPhotoRepository.findAllByOrderByCreatedAtDesc())
    .extracting(WeeklyPhoto::getTitle)
    .containsExactly("new", "old");
assertThat(scheduleImageRepository.findFirstByActiveTrueOrderByCreatedAtDesc())
    .get().extracting(ScheduleImage::getTitle).isEqualTo("active");
```

- [ ] **Step 2: Run and verify RED**

Run: `cd backend && mvn -Dtest=SharedContentRepositoryTest test`

Expected: FAIL because entities and repositories do not exist.

- [ ] **Step 3: Implement the entities and repositories**

Use Oracle-safe names and identity IDs. `StoredFile` stores the private object key and metadata. File-backed content uses a lazy `@ManyToOne` reference to `StoredFile`. Notice and lesson video contain metadata only.

Required repository queries:

```java
List<WeeklyPhoto> findAllByOrderByCreatedAtDesc();
List<ScheduleImage> findAllByOrderByCreatedAtDesc();
Optional<ScheduleImage> findFirstByActiveTrueOrderByCreatedAtDesc();
List<FoundationMaterial> findAllByOrderByCreatedAtDesc();
Optional<FoundationMaterial> findFirstByActiveTrueOrderByCreatedAtDesc();
List<Notice> findAllByOrderByCreatedAtDesc();
List<Notice> findByShowToTeachersTrueOrderByCreatedAtDesc();
List<LessonVideo> findAllByOrderByLessonNumberAsc();
```

- [ ] **Step 4: Run repository and full backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/kindergarden/recitation/entity backend/src/main/java/com/kindergarden/recitation/repository backend/src/test
git commit -m "feat: persist shared content metadata"
```

### Task 4: Shared Content Service with Transactional File Cleanup

**Files:**
- Create: `backend/src/main/java/com/kindergarden/recitation/dto/WeeklyPhotoDto.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/dto/ScheduleImageDto.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/dto/FoundationMaterialDto.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/dto/NoticeDto.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/dto/LessonVideoDto.java`
- Create: `backend/src/main/java/com/kindergarden/recitation/service/SharedContentService.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/service/SharedContentServiceTest.java`

- [ ] **Step 1: Write failing upload/list/delete service tests**

Use mocked repositories and a fake `PrivateFileStorage` to assert:

```java
WeeklyPhotoDto created = service.createWeeklyPhoto("Sunday", file, 1L, "ADMIN");
assertThat(created.title()).isEqualTo("Sunday");
assertThat(created.imageUrl()).startsWith("https://signed.example/");

service.deleteWeeklyPhoto(10L);
verify(privateFileStorage).delete("weekly_photo/object.jpg");
```

Add a failure test asserting an uploaded object is deleted if metadata save throws.

- [ ] **Step 2: Run and verify RED**

Run: `cd backend && mvn -Dtest=SharedContentServiceTest test`

Expected: FAIL because the service and DTOs do not exist.

- [ ] **Step 3: Implement `SharedContentService`**

The service must:

- Validate and upload through `PrivateFileStorage`.
- Persist a `StoredFile` before the content entity.
- Generate fresh 15-minute signed URLs only while mapping DTOs.
- Delete the private object when content is deleted.
- Deactivate other records before activating a schedule image or foundation PDF.
- Preserve original filenames.
- Normalize blank titles to original filenames.

- [ ] **Step 4: Run service and full backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/kindergarden/recitation/dto backend/src/main/java/com/kindergarden/recitation/service/SharedContentService.java backend/src/test/java/com/kindergarden/recitation/service/SharedContentServiceTest.java
git commit -m "feat: manage durable shared content"
```

### Task 5: Authenticated Shared Content APIs

**Files:**
- Create: `backend/src/main/java/com/kindergarden/recitation/controller/SharedContentController.java`
- Modify: `backend/src/main/java/com/kindergarden/recitation/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/controller/SharedContentControllerTest.java`

- [ ] **Step 1: Write failing authorization tests**

With `@WebMvcTest`, assert:

```java
mockMvc.perform(get("/api/content/weekly-photos")).andExpect(status().isUnauthorized());
mockMvc.perform(get("/api/content/weekly-photos").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TEACHER"))))
    .andExpect(status().isOk());
mockMvc.perform(delete("/api/admin/content/weekly-photos/1").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TEACHER"))))
    .andExpect(status().isForbidden());
```

- [ ] **Step 2: Run and verify RED**

Run: `cd backend && mvn -Dtest=SharedContentControllerTest test`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement the controller routes**

Authenticated reads:

```text
GET /api/content/weekly-photos
GET /api/content/schedule-images
GET /api/content/foundation-materials
GET /api/content/notices
GET /api/content/lesson-videos
```

Administrator mutations:

```text
POST   /api/admin/content/weekly-photos
DELETE /api/admin/content/weekly-photos/{id}
POST   /api/admin/content/schedule-images
PUT    /api/admin/content/schedule-images/{id}/active
DELETE /api/admin/content/schedule-images/{id}
POST   /api/admin/content/foundation-materials
PUT    /api/admin/content/foundation-materials/{id}/active
DELETE /api/admin/content/foundation-materials/{id}
POST   /api/admin/content/notices
DELETE /api/admin/content/notices/{id}
PUT    /api/admin/content/lesson-videos
```

Read the authenticated `userId` and role claims from `Jwt`.

- [ ] **Step 4: Remove public `/uploads/**` access**

Change `SecurityConfig` so only `/api/auth/**` and `/actuator/health` are public. Private files are accessed through signed URLs, not a public backend route.

- [ ] **Step 5: Run controller and full backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/kindergarden/recitation/controller/SharedContentController.java backend/src/main/java/com/kindergarden/recitation/config/SecurityConfig.java backend/src/test/java/com/kindergarden/recitation/controller
git commit -m "feat: expose authenticated shared content APIs"
```

### Task 6: Persist Profile Photos in Private Storage

**Files:**
- Modify: `backend/src/main/java/com/kindergarden/recitation/controller/ProfileController.java`
- Modify: `backend/src/main/java/com/kindergarden/recitation/service/RecitationService.java`
- Modify: `backend/src/main/java/com/kindergarden/recitation/service/AuthService.java`
- Modify: `backend/src/main/java/com/kindergarden/recitation/entity/Teacher.java`
- Modify: `backend/src/main/java/com/kindergarden/recitation/entity/Student.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/controller/ProfileControllerTest.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/service/ProfileUrlMappingTest.java`

- [ ] **Step 1: Write failing profile compatibility tests**

Assert the existing upload response shape remains:

```java
mockMvc.perform(multipart("/api/profiles/upload")
    .file(image)
    .param("type", "teacher")
    .param("id", "1")
    .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.url").value(startsWith("https://signed.example/")));
```

Assert profile DTO mapping converts a stable object key into a signed URL.

- [ ] **Step 2: Run and verify RED**

Run: `cd backend && mvn -Dtest=ProfileControllerTest,ProfileUrlMappingTest test`

Expected: FAIL because profile upload still writes to local disk.

- [ ] **Step 3: Replace local profile writes**

Inject `PrivateFileStorage` and persist `PROFILE/<uuid>` references. Delete the replaced object after the database update succeeds. Keep returning `{ "url": "<fresh signed url>" }`.

- [ ] **Step 4: Resolve profile URLs in all API DTOs**

Centralize signed URL resolution so login responses, profile lists, and recitation DTOs never expose raw object keys.

- [ ] **Step 5: Run profile and full backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/kindergarden/recitation backend/src/test/java/com/kindergarden/recitation
git commit -m "feat: store profile photos privately"
```

### Task 7: Seed the 52 Lesson Videos into Oracle

**Files:**
- Modify: `backend/src/main/java/com/kindergarden/recitation/config/DataInitializer.java`
- Test: `backend/src/test/java/com/kindergarden/recitation/config/DataInitializerLessonVideoTest.java`

- [ ] **Step 1: Write a failing idempotent seed test**

Call the lesson-video seed twice and assert the repository still contains exactly 52 unique lesson numbers and lesson 24 starts on `2026-06-14`.

- [ ] **Step 2: Run and verify RED**

Run: `cd backend && mvn -Dtest=DataInitializerLessonVideoTest test`

Expected: FAIL because lesson videos are not persisted.

- [ ] **Step 3: Move the existing 52-video metadata into an idempotent backend seed**

Seed only missing lesson numbers; do not overwrite administrator edits.

- [ ] **Step 4: Run seed and full backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/kindergarden/recitation/config/DataInitializer.java backend/src/test/java/com/kindergarden/recitation/config
git commit -m "feat: seed lesson videos in oracle"
```

### Task 8: Frontend Shared Content API Client

**Files:**
- Modify: `frontend/lib/api.ts`
- Create: `frontend/lib/legacyContentMigration.ts`
- Modify: `frontend/lib/weeklyPhotos.ts`
- Modify: `frontend/lib/scheduleImages.ts`
- Modify: `frontend/lib/foundationMaterials.ts`
- Modify: `frontend/lib/notices.ts`
- Modify: `frontend/lib/lessonVideos.ts`

- [ ] **Step 1: Add shared DTO types and request helpers**

Add API methods preserving current frontend shapes:

```ts
listWeeklyPhotos: () => request<WeeklyPhoto[]>("/api/content/weekly-photos"),
addWeeklyPhoto: (title: string, file: File) => uploadContent<WeeklyPhoto>("/api/admin/content/weekly-photos", title, file),
deleteWeeklyPhoto: (id: string) => request<void>(`/api/admin/content/weekly-photos/${id}`, { method: "DELETE" }),
```

Repeat for schedules, foundation materials, notices, and lesson videos.

- [ ] **Step 2: Add a legacy migration reader**

Create a helper that only reads existing `localStorage` keys and reports available categories. It must not delete legacy data:

```ts
export function readLegacyContent(): LegacyContent {
  return {
    weeklyPhotos: readWeeklyPhotos(),
    scheduleImages: readScheduleImages(),
    foundationMaterials: readFoundationMaterials(),
    notices: readAdminNotices(),
    lessonVideos: readLessonVideos(),
  };
}
```

- [ ] **Step 3: Build the frontend**

Run: `cd frontend && npm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib
git commit -m "feat: add shared content api client"
```

### Task 9: Switch Administrator Content Management to Server APIs

**Files:**
- Modify: `frontend/components/AdminDashboardView.tsx`

- [ ] **Step 1: Replace initial local reads with authenticated API loads**

Load all shared content in parallel after administrator authentication:

```ts
const [notices, photos, foundations, schedules, lessons] = await Promise.all([
  api.listNotices(),
  api.listWeeklyPhotos(),
  api.listFoundationMaterials(),
  api.listScheduleImages(),
  api.listLessonVideos(),
]);
```

- [ ] **Step 2: Replace add/delete/activate handlers**

Keep current labels, buttons, and toast text. Replace FileReader/data-URL storage with multipart API uploads and refresh state from API responses.

- [ ] **Step 3: Add one-time legacy import action**

Only show the action when legacy data exists. Import sequentially, report per-category progress, and preserve local data if any request fails.

- [ ] **Step 4: Build and manually verify admin interactions**

Run: `cd frontend && npm run build`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/AdminDashboardView.tsx
git commit -m "feat: manage shared content from server"
```

### Task 10: Switch Teacher Views to Server APIs

**Files:**
- Modify: `frontend/components/StartView.tsx`
- Modify: `frontend/components/FoundationView.tsx`
- Modify: `frontend/components/AdminProfileManager.tsx`

- [ ] **Step 1: Replace shared local reads in `StartView`**

After teacher authentication, load notices, weekly photos, schedule images, foundation materials, and lesson videos through `api`. Preserve local-only notice read/mute/today-hidden state.

- [ ] **Step 2: Use server foundation data in `FoundationView`**

Preserve existing fullscreen/mobile PDF behavior while accepting signed PDF URLs returned by the server.

- [ ] **Step 3: Stop using profile cache as source of truth**

Keep local caching only as a temporary display optimization. Reload authoritative profile signed URLs from `getAdminProfiles()` after upload.

- [ ] **Step 4: Build and visually verify all teacher tabs**

Run: `cd frontend && npm run build`

Expected: PASS.

Use the browser at mobile width to verify home, schedule, foundation, lessons, info, and admin content screens retain their existing layout.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/StartView.tsx frontend/components/FoundationView.tsx frontend/components/AdminProfileManager.tsx
git commit -m "feat: load teacher content from server"
```

### Task 11: Deployment Configuration and GCP Resources

**Files:**
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/Dockerfile`
- Modify: `README.md`

- [ ] **Step 1: Add storage environment configuration**

```yaml
app:
  storage:
    bucket: ${GCS_BUCKET_NAME:}
    signed-url-minutes: ${GCS_SIGNED_URL_MINUTES:15}
```

Set `SPRING_PROFILES_ACTIVE=gcp` only in Cloud Run.

- [ ] **Step 2: Run all local verification**

Run:

```bash
cd backend && mvn test
cd ../frontend && npm run build
```

Expected: both PASS.

- [ ] **Step 3: Create a private bucket**

```bash
gcloud storage buckets create gs://kindergarden-private-files-726974445152 \
  --project=kindergarden-backend-kkmm99jj \
  --location=asia-northeast3 \
  --uniform-bucket-level-access
gcloud storage buckets update gs://kindergarden-private-files-726974445152 --public-access-prevention
```

- [ ] **Step 4: Grant the Cloud Run service account object access and signing ability**

Grant bucket-scoped `roles/storage.objectUser`. Grant the service account the minimum permission needed to sign URLs using service-account credentials; verify signing from the deployed revision.

- [ ] **Step 5: Deploy Cloud Run**

Set:

```text
SPRING_PROFILES_ACTIVE=gcp
GCS_BUCKET_NAME=kindergarden-private-files-726974445152
GCS_SIGNED_URL_MINUTES=15
```

Retain all current Oracle wallet, JWT, CORS, CPU, memory, concurrency, min-instance, and max-instance settings.

- [ ] **Step 6: Commit deployment configuration**

```bash
git add backend/src/main/resources/application.yml backend/Dockerfile README.md
git commit -m "docs: configure private cloud storage deployment"
```

### Task 12: End-to-End Security and Durability Verification

**Files:**
- No source changes unless verification reveals a defect.

- [ ] **Step 1: Verify private bucket access**

Run unauthenticated direct object access and confirm HTTP 403.

- [ ] **Step 2: Verify administrator uploads**

Upload a profile photo, weekly image, schedule image, and foundation PDF. Create a notice and confirm the 52 lesson videos exist.

- [ ] **Step 3: Verify cross-device teacher access**

Log in from a separate browser origin and confirm all shared data appears without local storage.

- [ ] **Step 4: Verify authentication boundaries**

Confirm unauthenticated `/api/content/**` returns 401 and teacher calls to `/api/admin/content/**` return 403.

- [ ] **Step 5: Verify restart durability**

Deploy a new Cloud Run revision or restart the service, then confirm all files and metadata remain available.

- [ ] **Step 6: Verify signed URL expiration behavior**

Confirm an issued URL is temporary and a screen refresh retrieves a fresh working URL.

- [ ] **Step 7: Review logs**

Confirm the latest Cloud Run revision contains no upload, signing, authorization, Oracle, or object-not-found errors.

- [ ] **Step 8: Final commit and push**

Run:

```bash
git status --short
git push origin main
```

Expected: only intentionally retained unrelated changes remain, and `main` is pushed.
