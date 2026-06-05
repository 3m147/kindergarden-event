package com.kindergarden.recitation.dto;

import java.time.LocalDate;

public record PersonProfileDto(
    Long id,
    String name,
    String type,
    String className,
    Long classId,
    String role,
    String photoUrl,
    LocalDate birthDate,
    String parentName
) {}
