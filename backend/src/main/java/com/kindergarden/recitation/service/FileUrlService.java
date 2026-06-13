package com.kindergarden.recitation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FileUrlService {
    private final SharedContentService sharedContentService;

    public String resolve(String reference) {
        if (reference == null || reference.isBlank()) return null;
        if (reference.matches("^(https?://|data:|blob:).*")) return reference;
        return sharedContentService.readUrl(reference);
    }
}
