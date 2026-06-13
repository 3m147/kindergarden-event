package com.kindergarden.recitation.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class LocalFileStorageTest {

    @TempDir
    Path tempDir;

    @Test
    void uploadsReadsAndDeletesAFile() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), "http://localhost:8080");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "photo.jpg",
                "image/jpeg",
                "photo".getBytes()
        );

        StoredObject stored = storage.upload(StoredFileCategory.PROFILE, file);

        assertThat(Files.exists(tempDir.resolve(stored.objectKey()))).isTrue();
        assertThat(storage.createReadUri(stored.objectKey(), Duration.ofMinutes(15)).toString())
                .startsWith("http://localhost:8080/uploads/");
        storage.delete(stored.objectKey());
        assertThat(Files.exists(tempDir.resolve(stored.objectKey()))).isFalse();
    }

    @Test
    void rejectsUnsupportedFile() {
        LocalFileStorage storage = new LocalFileStorage(tempDir.toString(), "http://localhost:8080");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document.pdf",
                "application/pdf",
                "pdf".getBytes()
        );

        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> storage.upload(StoredFileCategory.PROFILE, file)
        ).isInstanceOf(IllegalArgumentException.class);
    }
}
