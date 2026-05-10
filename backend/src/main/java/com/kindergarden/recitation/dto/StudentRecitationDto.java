package com.kindergarden.recitation.dto;

import java.util.Map;

// 학생 1명의 오늘 암송 상태. 프론트 학생 리스트 렌더링에 그대로 사용.
public record StudentRecitationDto(
        Long studentId,
        String name,
        String photoUrl,
        String className,
        Long classId,
        Map<Integer, String> lessonStates,
        Map<Integer, String> quizStates,
        Map<Integer, String> kindergartenStates,
        Map<String, String> kindergartenActivityStates,
        boolean submitted,
        String teacherName
) {}
