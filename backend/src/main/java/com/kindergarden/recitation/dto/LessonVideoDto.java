package com.kindergarden.recitation.dto;
import java.time.LocalDateTime;
public record LessonVideoDto(Long id, Integer lessonNumber, String title, String url, String videoId, String pastor, String description, LocalDateTime createdAt) {}
