package com.kindergarden.recitation.dto;
import java.time.LocalDateTime;
public record WeeklyPhotoDto(Long id, String title, String imageUrl, LocalDateTime createdAt) {}
