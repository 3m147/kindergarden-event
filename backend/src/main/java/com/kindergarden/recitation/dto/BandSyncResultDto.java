package com.kindergarden.recitation.dto;
// 동기화 결과 요약.
public record BandSyncResultDto(int imported, int skipped, String message) {}
