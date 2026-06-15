package com.kindergarden.recitation.service;

import com.kindergarden.recitation.dto.ClassDto;
import com.kindergarden.recitation.dto.StudentRecitationDto;
import com.kindergarden.recitation.dto.PersonProfileDto;
import com.kindergarden.recitation.entity.ClassEntity;
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
import java.util.ArrayList;
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
    private final FileUrlService fileUrlService;

    @Transactional(readOnly = true)
    public List<ClassDto> listClasses() {
        return classRepository.findAll().stream()
                .map(c -> new ClassDto(c.getId(), c.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentRecitationDto> getClassStatus(Long classId, LocalDate date) {
        List<Student> students = studentRepository.findByClassEntityIdOrderByNameAsc(classId);
        // 체크는 날짜와 무관하게 "현재 상태"로 유지된다 — 반 전체 기록을 가져온 뒤
        // (학생·과·종류)별로 가장 최근 기록만 추려 현재 상태로 보여준다.
        List<RecitationRecord> records = recordRepository.findByClass(classId);

        Map<Long, List<RecitationRecord>> byStudent = records.stream()
                .collect(Collectors.groupingBy(r -> r.getStudent().getId()));

        return students.stream().map(s -> {
            List<RecitationRecord> studentRecords = latestPerKey(byStudent.getOrDefault(s.getId(), List.of()));
            
            Map<Integer, String> lessonStates = new HashMap<>();
            Map<Integer, String> quizStates = new HashMap<>();
            Map<Integer, String> kindergartenStates = new HashMap<>();
            Map<String, String> kindergartenActivityStates = new HashMap<>();
            boolean submitted = false;
            String teacherName = "";

            for (RecitationRecord r : studentRecords) {
                if ("RECITATION".equals(r.getType())) {
                    lessonStates.put(r.getLessonNumber(), r.getResult().toLowerCase());
                } else if ("QUIZ".equals(r.getType())) {
                    quizStates.put(r.getLessonNumber(), r.getResult().toLowerCase());
                } else if ("KINDERGARTEN".equals(r.getType())) {
                    kindergartenStates.put(r.getLessonNumber(), r.getResult().toLowerCase());
                } else if (r.getType().startsWith("KINDERGARTEN_")) {
                    kindergartenActivityStates.put(r.getLessonNumber() + ":" + r.getType(), r.getResult().toLowerCase());
                }
                if (r.isSubmitted()) submitted = true;
                if (teacherName.isEmpty() && r.getTeacher() != null) {
                    teacherName = r.getTeacher().getName();
                }
            }

            return new StudentRecitationDto(
                    s.getId(),
                    s.getName(),
                    fileUrlService.resolve(s.getPhotoUrl()),
                    s.getBirthDate(),
                    s.getParentName(),
                    s.getClassEntity().getName(),
                    s.getClassEntity().getId(),
                    lessonStates,
                    quizStates,
                    kindergartenStates,
                    kindergartenActivityStates,
                    submitted,
                    teacherName
            );
        }).toList();
    }

    @Transactional
    public StudentRecitationDto createStudent(Long classId, String name, LocalDate birthDate, String parentName) {
        String trimmedName = name == null ? "" : name.trim();
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("학생 이름을 입력해 주세요.");
        }

        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("반 없음: " + classId));

        Student student = Student.builder()
                .name(trimmedName)
                .birthDate(birthDate)
                .parentName(normalizeOptional(parentName))
                .classEntity(classEntity)
                .build();

        Student saved = studentRepository.save(student);
        return getClassStatus(classId, LocalDate.now())
                .stream()
                .filter(dto -> dto.studentId().equals(saved.getId()))
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public PersonProfileDto updateTeacher(Long teacherId, String name) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("교사 없음: " + teacherId));
        teacher.setName(requireName(name, "교사 이름"));
        return toProfile(teacherRepository.save(teacher));
    }

    @Transactional
    public PersonProfileDto updateStudent(Long studentId, String name, LocalDate birthDate, String parentName) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
        student.setName(requireName(name, "아이 이름"));
        student.setBirthDate(birthDate);
        student.setParentName(normalizeOptional(parentName));
        return toProfile(studentRepository.save(student));
    }

    @Transactional
    public StudentRecitationDto setRecitation(Long studentId, LocalDate date, Integer lessonNumber, String type, Boolean success, Long teacherId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));

        // 날짜와 무관하게 (학생·과·종류)의 현재 기록을 찾아 상태를 갱신한다.
        List<RecitationRecord> existing = recordRepository.findByStudentIdAndLessonNumberAndType(studentId, lessonNumber, type);
        RecitationRecord latest = existing.stream().max(RecitationService::byRecency).orElse(null);

        if (latest != null && latest.isSubmitted()) {
            throw new IllegalStateException("이미 제출된 기록은 수정할 수 없습니다.");
        }

        if (success == null) {
            // 체크 해제 — 해당 기능의 모든 기록을 지워 현재 상태를 비운다.
            if (!existing.isEmpty()) recordRepository.deleteAll(existing);
            return statusFor(student, studentId);
        }

        RecitationRecord record = latest;
        if (record == null) {
            record = RecitationRecord.builder()
                    .student(student)
                    .recordDate(date)
                    .lessonNumber(lessonNumber)
                    .type(type)
                    .teacher(resolveTeacher(teacherId, student))
                    .submitted(false)
                    .build();
        }
        record.setResult(success ? "SUCCESS" : "FAIL");
        recordRepository.save(record);
        return statusFor(student, studentId);
    }

    private static int byRecency(RecitationRecord a, RecitationRecord b) {
        int c = a.getRecordDate().compareTo(b.getRecordDate());
        if (c != 0) return c;
        return a.getUpdatedAt().compareTo(b.getUpdatedAt());
    }

    // (학생 한 명의) 기록들을 (과·종류)별 최신 1건으로 추린다.
    private List<RecitationRecord> latestPerKey(List<RecitationRecord> records) {
        Map<String, RecitationRecord> latest = new HashMap<>();
        for (RecitationRecord r : records) {
            String key = r.getLessonNumber() + ":" + r.getType();
            RecitationRecord current = latest.get(key);
            if (current == null || byRecency(r, current) >= 0) latest.put(key, r);
        }
        return new ArrayList<>(latest.values());
    }

    private Teacher resolveTeacher(Long teacherId, Student student) {
        Teacher t = null;
        if (teacherId != null && teacherId > 0) {
            t = teacherRepository.findById(teacherId).orElse(null);
        }
        if (t == null) {
            List<Teacher> teachers = teacherRepository.findByClassEntityIdOrderByNameAsc(student.getClassEntity().getId());
            t = !teachers.isEmpty() ? teachers.get(0) : teacherRepository.findAll().stream().findFirst().orElse(null);
        }
        if (t == null) {
            throw new IllegalArgumentException("시스템에 등록된 교사가 없습니다. 교사를 먼저 등록해 주세요.");
        }
        return t;
    }

    private StudentRecitationDto statusFor(Student student, Long studentId) {
        return getClassStatus(student.getClassEntity().getId(), LocalDate.now())
                .stream()
                .filter(dto -> dto.studentId().equals(studentId))
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public StudentRecitationDto submitStudent(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
        int updated = recordRepository.markSubmittedByStudent(studentId);
        if (updated == 0) {
            throw new IllegalStateException("제출할 기록이 없습니다.");
        }
        return statusFor(student, studentId);
    }

    @Transactional
    public StudentRecitationDto unlockStudentSubmission(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("학생 없음: " + studentId));
        recordRepository.markUnsubmittedByStudent(studentId);
        return statusFor(student, studentId);
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
            profiles.add(toProfile(t));
        });
        
        studentRepository.findAll().forEach(s -> {
            profiles.add(toProfile(s));
        });
        
        return profiles;
    }

    private PersonProfileDto toProfile(Teacher teacher) {
        return new PersonProfileDto(
                teacher.getId(), teacher.getName(), "teacher",
                teacher.getClassEntity().getName(), teacher.getClassEntity().getId(),
                teacher.getRole(), fileUrlService.resolve(teacher.getPhotoUrl()), null, null
        );
    }

    private PersonProfileDto toProfile(Student student) {
        return new PersonProfileDto(
                student.getId(), student.getName(), "student",
                student.getClassEntity().getName(), student.getClassEntity().getId(),
                null, fileUrlService.resolve(student.getPhotoUrl()), student.getBirthDate(), student.getParentName()
        );
    }

    private String requireName(String value, String label) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new IllegalArgumentException(label + "을 입력해 주세요.");
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
