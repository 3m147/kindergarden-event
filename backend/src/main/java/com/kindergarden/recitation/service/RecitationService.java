package com.kindergarden.recitation.service;

import com.kindergarden.recitation.dto.ClassDto;
import com.kindergarden.recitation.dto.StudentRecitationDto;
import com.kindergarden.recitation.entity.RecitationRecord;
import com.kindergarden.recitation.entity.Student;
import com.kindergarden.recitation.repository.ClassRepository;
import com.kindergarden.recitation.repository.RecitationRecordRepository;
import com.kindergarden.recitation.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecitationService {

    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final RecitationRecordRepository recordRepository;

    @Transactional(readOnly = true)
    public List<ClassDto> listClasses() {
        return classRepository.findAll().stream()
                .map(c -> new ClassDto(c.getId(), c.getName()))
                .toList();
    }

    // 반의 오늘 암송 상태 조회 — 기록이 없는 학생은 success=false 로 조립.
    @Transactional(readOnly = true)
    public List<StudentRecitationDto> getClassStatus(Long classId, LocalDate date) {
        List<Student> students = studentRepository.findByClassEntityIdOrderByNameAsc(classId);

        Map<Long, RecitationRecord> byStudent = new HashMap<>();
        for (RecitationRecord r : recordRepository.findByClassAndDate(classId, date)) {
            byStudent.put(r.getStudent().getId(), r);
        }

        return students.stream().map(s -> {
            RecitationRecord r = byStudent.get(s.getId());
            return new StudentRecitationDto(
                    s.getId(),
                    s.getName(),
                    r != null && r.isSuccess(),
                    r != null && r.isSubmitted()
            );
        }).toList();
    }

    // 오늘 기록을 upsert. 최종 제출된 기록은 보호.
    @Transactional
    public StudentRecitationDto setRecitation(Long studentId, LocalDate date, boolean success) {
        RecitationRecord record = recordRepository
                .findByStudentIdAndRecordDate(studentId, date)
                .orElseGet(() -> {
                    Student s = studentRepository.findById(studentId)
                            .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
                    return RecitationRecord.builder()
                            .student(s)
                            .recordDate(date)
                            .success(false)
                            .submitted(false)
                            .build();
                });

        if (record.isSubmitted()) {
            throw new IllegalStateException("이미 제출된 기록은 수정할 수 없습니다.");
        }

        record.setSuccess(success);
        RecitationRecord saved = recordRepository.save(record);
        return new StudentRecitationDto(
                saved.getStudent().getId(),
                saved.getStudent().getName(),
                saved.isSuccess(),
                saved.isSubmitted()
        );
    }

    // 해당 반/날짜 기록 일괄 제출. 기록이 없는 학생은 success=false 로 미리 생성해
    // "미암송"도 명시적으로 전광판에 반영될 수 있게 한다.
    @Transactional
    public int submitClass(Long classId, LocalDate date) {
        List<Student> students = studentRepository.findByClassEntityIdOrderByNameAsc(classId);
        for (Student s : students) {
            recordRepository.findByStudentIdAndRecordDate(s.getId(), date)
                    .orElseGet(() -> recordRepository.save(
                            RecitationRecord.builder()
                                    .student(s)
                                    .recordDate(date)
                                    .success(false)
                                    .submitted(false)
                                    .build()
                    ));
        }
        return recordRepository.markSubmittedByClassAndDate(classId, date);
    }
}
