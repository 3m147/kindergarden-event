package com.kindergarden.recitation.storage;

import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.time.Duration;

public interface PrivateFileStorage {
    StoredObject upload(StoredFileCategory category, MultipartFile file);

    URI createReadUri(String objectKey, Duration lifetime);

    void delete(String objectKey);
}
