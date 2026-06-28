package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "foundation_material")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FoundationMaterial {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "foundation_material_id") private Long id;
    @Column(nullable = false, length = 200) private String title;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "stored_file_id") private StoredFile file;
    @Column(name = "is_active", nullable = false) private boolean active;
    @Builder.Default
    @Column(name = "age_group", length = 20) private String ageGroup = "AGE_3_4";
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (ageGroup == null || ageGroup.isBlank()) ageGroup = "AGE_3_4";
    }
}
