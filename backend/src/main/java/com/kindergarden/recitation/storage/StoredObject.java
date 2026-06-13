package com.kindergarden.recitation.storage;

public record StoredObject(
        String objectKey,
        String originalFileName,
        String contentType,
        long sizeBytes
) {
}
