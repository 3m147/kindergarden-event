package com.kindergarden.recitation.dto;
// 밴드 연동 설정 저장 요청. accessToken 이 비어 있으면 기존 토큰을 유지한다.
public record BandConfigRequest(
        String accessToken,
        String bandKey,
        String photoAlbumKey,
        Boolean enabled
) {}
