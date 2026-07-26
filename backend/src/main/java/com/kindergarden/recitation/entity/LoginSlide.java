package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

// 로그인 화면 배경 슬라이드쇼 사진.
@Entity @Table(name = "login_slide")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginSlide {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "login_slide_id") private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "stored_file_id") private StoredFile file;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
