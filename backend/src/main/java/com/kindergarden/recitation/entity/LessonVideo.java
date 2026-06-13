package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "lesson_video")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LessonVideo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "lesson_video_id") private Long id;
    @Column(name = "lesson_number", unique = true) private Integer lessonNumber;
    @Column(nullable = false, length = 300) private String title;
    @Column(nullable = false, length = 500) private String url;
    @Column(name = "video_id", nullable = false, length = 20) private String videoId;
    @Column(length = 100) private String pastor;
    @Column(length = 500) private String description;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
