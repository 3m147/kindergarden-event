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
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
