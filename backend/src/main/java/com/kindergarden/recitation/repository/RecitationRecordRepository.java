package com.kindergarden.recitation.repository;

import com.kindergarden.recitation.entity.RecitationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecitationRecordRepository extends JpaRepository<RecitationRecord, Long> {

    Optional<RecitationRecord> findByStudentIdAndRecordDateAndLessonNumberAndType(
        Long studentId, LocalDate date, Integer lessonNumber, String type);

    @Query("""
        select r from RecitationRecord r
        where r.student.classEntity.id = :classId and r.recordDate = :date
    """)
    List<RecitationRecord> findByClassAndDate(@Param("classId") Long classId,
                                              @Param("date") LocalDate date);

    @Modifying
    @Query("""
        update RecitationRecord r set r.submitted = true
        where r.student.classEntity.id = :classId and r.recordDate = :date
    """)
    int markSubmittedByClassAndDate(@Param("classId") Long classId,
                                    @Param("date") LocalDate date);

    @Modifying
    @Query("""
        update RecitationRecord r set r.submitted = true
        where r.student.id = :studentId and r.recordDate = :date
    """)
    int markSubmittedByStudentAndDate(@Param("studentId") Long studentId,
                                      @Param("date") LocalDate date);

    @Modifying
    @Query("""
        update RecitationRecord r set r.submitted = false
        where r.student.id = :studentId and r.recordDate = :date
    """)
    int markUnsubmittedByStudentAndDate(@Param("studentId") Long studentId,
                                        @Param("date") LocalDate date);
}
