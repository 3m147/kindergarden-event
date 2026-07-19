package com.kindergarden.recitation.dto;
import java.time.LocalDateTime;
// 관리자에게 보여줄 밴드 연동 상태. 액세스 토큰 원문은 절대 내보내지 않고 연결 여부만 알린다.
public record BandConfigDto(
        boolean connected,
        boolean enabled,
        String bandKey,
        String photoAlbumKey,
        LocalDateTime lastSyncedAt
) {}
