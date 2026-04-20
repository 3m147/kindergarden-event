package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "recitation_record",
    uniqueConstraints = @UniqueConstraint(name = "uq_student_date", columnNames = {"student_id", "record_date"})
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RecitationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    // 암송 성공 여부 (토글 대상)
    @Column(nullable = false)
    private boolean success;

    // 담당 교사가 최종 제출한 기록인지 — 전광판 반영 여부와 직결.
    @Column(nullable = false)
    private boolean submitted;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    void onWrite() {
        this.updatedAt = LocalDateTime.now();
    }
}
