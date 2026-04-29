package com.kindergarden.recitation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "recitation_record",
    uniqueConstraints = @UniqueConstraint(name = "uq_student_date_lesson_type", columnNames = {"student_id", "record_date", "lesson_number", "type"}),
    indexes = {
        @Index(name = "idx_record_date", columnList = "record_date"),
        @Index(name = "idx_record_teacher", columnList = "teacher_id")
    }
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

    @Column(name = "lesson_number", nullable = false)
    private Integer lessonNumber;

    @Column(nullable = false, length = 20)
    private String type; // "RECITATION" or "QUIZ"

    @Column(nullable = false, length = 20)
    private String result; // "SUCCESS" or "FAIL"

    // 담당 교사가 최종 제출한 기록인지 — 전광판 반영 여부와 직결.
    @Column(nullable = false)
    private boolean submitted;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    void onWrite() {
        this.updatedAt = LocalDateTime.now();
    }
}
