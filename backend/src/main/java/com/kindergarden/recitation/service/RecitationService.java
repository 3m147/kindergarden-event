package com.kindergarden.recitation.service;

import com.kindergarden.recitation.dto.ClassDto;
import com.kindergarden.recitation.dto.StudentRecitationDto;
import com.kindergarden.recitation.entity.RecitationRecord;
import com.kindergarden.recitation.entity.Student;
import com.kindergarden.recitation.entity.Teacher;
import com.kindergarden.recitation.repository.ClassRepository;
import com.kindergarden.recitation.repository.RecitationRecordRepository;
import com.kindergarden.recitation.repository.StudentRepository;
import com.kindergarden.recitation.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecitationService {

    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final RecitationRecordRepository recordRepository;
    private final TeacherRepository teacherRepository;

    @Transactional(readOnly = true)
    public List<ClassDto> listClasses() {
        return classRepository.findAll().stream()
                .map(c -> new ClassDto(c.getId(), c.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentRecitationDto> getClassStatus(Long classId, LocalDate date) {
        List<Student> students = studentRepository.findByClassEntityIdOrderByNameAsc(classId);
        List<RecitationRecord> records = recordRepository.findByClassAndDate(classId, date);

        // Group records by studentId
        Map<Long, List<RecitationRecord>> byStudent = records.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getId()));

        return students.stream().map(s -> {
            List<RecitationRecord> studentRecords = byStudent.getOrDefault(s.getId(), List.of());
            
            Map<Integer, String> lessonStates = new HashMap<>();
            Map<Integer, String> quizStates = new HashMap<>();
            Map<Integer, String> kindergartenStates = new HashMap<>();
            boolean submitted = false;
            String teacherName = "";

            for (RecitationRecord r : studentRecords) {
                if ("RECITATION".equals(r.getType())) {
                    lessonStates.put(r.getLessonNumber(), r.getResult().toLowerCase());
                } else if ("QUIZ".equals(r.getType())) {
                    quizStates.put(r.getLessonNumber(), r.getResult().toLowerCase());
                } else if ("KINDERGARTEN".equals(r.getType())) {
                    kindergartenStates.put(r.getLessonNumber(), r.getResult().toLowerCase());
                }
                if (r.isSubmitted()) submitted = true;
                if (teacherName.isEmpty() && r.getTeacher() != null) {
                    teacherName = r.getTeacher().getName();
                }
            }

            return new StudentRecitationDto(
                    s.getId(),
                    s.getName(),
                    s.getPhotoUrl(),
                    s.getClassEntity().getName(),
                    s.getClassEntity().getId(),
                    lessonStates,
                    quizStates,
                    kindergartenStates,
                    submitted,
                    teacherName
            );
        }).toList();
    }

    @Transactional
    public StudentRecitationDto setRecitation(Long studentId, LocalDate date, Integer lessonNumber, String type, Boolean success, Long teacherId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
        var existing = recordRepository.findByStudentIdAndRecordDateAndLessonNumberAndType(studentId, date, lessonNumber, type);

        if (existing.map(RecitationRecord::isSubmitted).orElse(false)) {
            throw new IllegalStateException("이미 제출된 기록은 수정할 수 없습니다.");
        }

        if (success == null) {
            existing.ifPresent(recordRepository::delete);
            return getClassStatus(student.getClassEntity().getId(), date)
                    .stream()
                    .filter(dto -> dto.studentId().equals(studentId))
                    .findFirst()
                    .orElseThrow();
        }

        RecitationRecord record = existing.orElseGet(() -> {
            Teacher t = teacherRepository.findById(teacherId)
                    .orElseThrow(() -> new IllegalArgumentException("교사 없음: " + teacherId));
            return RecitationRecord.builder()
                    .student(student)
                    .recordDate(date)
                    .lessonNumber(lessonNumber)
                    .type(type)
                    .teacher(t)
                    .submitted(false)
                    .build();
        });

        record.setResult(success ? "SUCCESS" : "FAIL");
        recordRepository.save(record);
        
        // Return full status for this student
        return getClassStatus(student.getClassEntity().getId(), date)
                .stream()
                .filter(dto -> dto.studentId().equals(studentId))
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public StudentRecitationDto submitStudent(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
        int updated = recordRepository.markSubmittedByStudentAndDate(studentId, date);
        if (updated == 0) {
            throw new IllegalStateException("제출할 기록이 없습니다.");
        }
        return getClassStatus(student.getClassEntity().getId(), date)
                .stream()
                .filter(dto -> dto.studentId().equals(studentId))
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public StudentRecitationDto unlockStudentSubmission(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
        recordRepository.markUnsubmittedByStudentAndDate(studentId, date);
        return getClassStatus(student.getClassEntity().getId(), date)
                .stream()
                .filter(dto -> dto.studentId().equals(studentId))
                .findFirst()
                .orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<StudentRecitationDto> getAllScores(LocalDate date) {
        List<ClassDto> classes = listClasses();
        return classes.stream()
                .flatMap(c -> getClassStatus(c.classId(), date).stream())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.kindergarden.recitation.dto.PersonProfileDto> listAllProfiles() {
        List<com.kindergarden.recitation.dto.PersonProfileDto> profiles = new java.util.ArrayList<>();
        
        teacherRepository.findAll().forEach(t -> {
            profiles.add(new com.kindergarden.recitation.dto.PersonProfileDto(
                t.getId(), t.getName(), "teacher", 
                t.getClassEntity().getName(), t.getClassEntity().getId(),
                t.getRole(), t.getPhotoUrl()
            ));
        });
        
        studentRepository.findAll().forEach(s -> {
            profiles.add(new com.kindergarden.recitation.dto.PersonProfileDto(
                s.getId(), s.getName(), "student", 
                s.getClassEntity().getName(), s.getClassEntity().getId(),
                null, s.getPhotoUrl()
            ));
        });
        
        return profiles;
    }
}
