package com.kindergarden.recitation.storage;

import java.util.Set;

public enum StoredFileCategory {
    PROFILE(Set.of("image/jpeg", "image/png", "image/webp"), 5L * 1024 * 1024),
    WEEKLY_PHOTO(Set.of("image/jpeg", "image/png", "image/webp"), 10L * 1024 * 1024),
    SCHEDULE_IMAGE(Set.of("image/jpeg", "image/png", "image/webp"), 10L * 1024 * 1024),
    FOUNDATION_PDF(Set.of("application/pdf"), 20L * 1024 * 1024);

    private final Set<String> contentTypes;
    private final long maxBytes;

    StoredFileCategory(Set<String> contentTypes, long maxBytes) {
        this.contentTypes = contentTypes;
        this.maxBytes = maxBytes;
    }

    public boolean accepts(String contentType, long size) {
        return contentTypes.contains(contentType) && size > 0 && size <= maxBytes;
    }

    public String pathSegment() {
        return name().toLowerCase();
    }
}
