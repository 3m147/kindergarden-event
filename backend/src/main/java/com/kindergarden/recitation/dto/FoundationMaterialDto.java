package com.kindergarden.recitation.dto;
import java.time.LocalDateTime;
public record FoundationMaterialDto(Long id, String title, String fileName, String pdfUrl, LocalDateTime createdAt, boolean isActive, String ageGroup) {}
