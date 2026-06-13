package com.kindergarden.recitation.entity;

import com.kindergarden.recitation.storage.StoredFileCategory;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stored_file")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoredFile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stored_file_id")
    private Long id;

    @Column(name = "object_key", nullable = false, unique = true, length = 500)
    private String objectKey;

    @Column(name = "original_file_name", nullable = false, length = 500)
    private String originalFileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StoredFileCategory category;

    @Column(name = "created_by_type", length = 20)
    private String createdByType;

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
