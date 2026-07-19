package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "weekly_photo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WeeklyPhoto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "weekly_photo_id") private Long id;
    @Column(nullable = false, length = 200) private String title;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "stored_file_id") private StoredFile file;
    // 출처 구분: "MANUAL"(직접 업로드) 또는 "BAND"(네이버 밴드 동기화). null 은 MANUAL 로 취급.
    @Column(name = "source", length = 20) private String source;
    // 밴드에서 가져온 사진의 원본 photo_key — 중복 동기화 방지용.
    @Column(name = "source_photo_key", unique = true, length = 200) private String sourcePhotoKey;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
