package com.kindergarden.recitation.dto;
import java.time.LocalDateTime;
public record NoticeDto(Long id, String title, String content, LocalDateTime createdAt, boolean showToTeachers) {}
