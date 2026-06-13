package com.kindergarden.recitation.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

@Component
@Profile("!gcp")
public class LocalFileStorage implements PrivateFileStorage {

    private final Path uploadRoot;
    private final String publicUrl;

    public LocalFileStorage(
            @Value("${file.upload-dir:uploads}") String uploadDir,
            @Value("${app.public-url:http://localhost:8080}") String publicUrl
    ) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicUrl = normalizePublicUrl(publicUrl);
    }

    @Override
    public StoredObject upload(StoredFileCategory category, MultipartFile file) {
        validate(category, file);
        String objectKey = createObjectKey(category, file.getOriginalFilename());
        Path target = uploadRoot.resolve(objectKey).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("잘못된 파일 경로입니다.");
        }

        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target);
            return new StoredObject(
                    objectKey,
                    safeOriginalFilename(file.getOriginalFilename()),
                    file.getContentType(),
                    file.getSize()
            );
        } catch (IOException e) {
            throw new IllegalStateException("파일 저장 실패", e);
        }
    }

    @Override
    public URI createReadUri(String objectKey, Duration lifetime) {
        return URI.create(publicUrl + "/uploads/" + objectKey);
    }

    @Override
    public void delete(String objectKey) {
        Path target = uploadRoot.resolve(objectKey).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("잘못된 파일 경로입니다.");
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new IllegalStateException("파일 삭제 실패", e);
        }
    }

    static void validate(StoredFileCategory category, MultipartFile file) {
        if (file == null || file.isEmpty() || !category.accepts(file.getContentType(), file.getSize())) {
            throw new IllegalArgumentException("지원하지 않는 파일 형식이거나 파일 용량이 너무 큽니다.");
        }
    }

    static String createObjectKey(StoredFileCategory category, String originalFilename) {
        return category.pathSegment() + "/" + UUID.randomUUID() + extensionOf(originalFilename);
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return "";
        String extension = filename.substring(dot).toLowerCase(Locale.ROOT);
        return extension.matches("\\.[a-z0-9]{1,8}") ? extension : "";
    }

    private static String safeOriginalFilename(String filename) {
        if (filename == null || filename.isBlank()) return "upload";
        return Paths.get(filename).getFileName().toString();
    }

    private static String normalizePublicUrl(String publicUrl) {
        String value = publicUrl == null ? "" : publicUrl.trim();
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = "https://" + value;
        }
        return value.replaceAll("/+$", "");
    }
}
