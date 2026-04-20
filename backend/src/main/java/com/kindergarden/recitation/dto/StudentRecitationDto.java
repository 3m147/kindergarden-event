package com.kindergarden.recitation.dto;

// 학생 1명의 오늘 암송 상태. 프론트 학생 리스트 렌더링에 그대로 사용.
public record StudentRecitationDto(
        Long studentId,
        String name,
        boolean success,
        boolean submitted
) {}
