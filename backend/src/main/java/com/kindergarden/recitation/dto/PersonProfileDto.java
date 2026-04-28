package com.kindergarden.recitation.dto;

public record PersonProfileDto(
    Long id,
    String name,
    String type,
    String className,
    Long classId,
    String role,
    String photoUrl
) {}
