package com.kindergarden.recitation.dto;
import java.time.LocalDateTime;
public record ScheduleImageDto(Long id, String title, String imageUrl, String fileName, LocalDateTime createdAt, boolean isActive) {}
