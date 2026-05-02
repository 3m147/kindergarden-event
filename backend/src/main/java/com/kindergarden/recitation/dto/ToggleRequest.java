package com.kindergarden.recitation.dto;

// success 를 명시적으로 받아 idempotent 하게 처리.
// 프론트에서 "토글 후 새 상태"를 보내면 네트워크 재시도 시에도 안전.
public record ToggleRequest(Integer lessonNumber, String type, Boolean success, Long teacherId) {}
