package com.kindergarden.recitation.dto;

import java.time.LocalDate;

public record CreateStudentRequest(String name, LocalDate birthDate, String parentName) {
}
