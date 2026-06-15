package com.kindergarden.recitation.repository;

import com.kindergarden.recitation.entity.RecitationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecitationRecordRepository extends JpaRepository<RecitationRecord, Long> {

    // 체크는 "현재 상태"로 유지된다 — 날짜와 무관하게 (학생·과·종류)별 기록을 본다.
    List<RecitationRecord> findByStudentIdAndLessonNumberAndType(
        Long studentId, Integer lessonNumber, String type);

    @Query("""
        select r from RecitationRecord r
        where r.student.classEntity.id = :classId
    """)
    List<RecitationRecord> findByClass(@Param("classId") Long classId);

    @Modifying
    @Query("""
        update RecitationRecord r set r.submitted = true
        where r.student.id = :studentId
    """)
    int markSubmittedByStudent(@Param("studentId") Long studentId);

    @Modifying
    @Query("""
        update RecitationRecord r set r.submitted = false
        where r.student.id = :studentId
    """)
    int markUnsubmittedByStudent(@Param("studentId") Long studentId);
}
