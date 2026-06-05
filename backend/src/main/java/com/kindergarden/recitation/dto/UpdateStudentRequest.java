package com.kindergarden.recitation.dto;

import java.time.LocalDate;

public record UpdateStudentRequest(
        String name,
        LocalDate birthDate,
        String parentName
) {
}
