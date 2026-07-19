package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

// 네이버 밴드 연동 설정 — 앱 전체에서 한 행(싱글톤)만 유지한다.
@Entity @Table(name = "band_integration")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BandIntegration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "band_integration_id") private Long id;

    @Lob @Column(name = "access_token") private String accessToken;
    @Lob @Column(name = "refresh_token") private String refreshToken;
    @Column(name = "band_key", length = 200) private String bandKey;
    @Column(name = "photo_album_key", length = 200) private String photoAlbumKey;
    @Column(name = "enabled", nullable = false) private boolean enabled;
    @Column(name = "last_synced_at") private LocalDateTime lastSyncedAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    @PrePersist @PreUpdate void onSave() { updatedAt = LocalDateTime.now(); }
}
