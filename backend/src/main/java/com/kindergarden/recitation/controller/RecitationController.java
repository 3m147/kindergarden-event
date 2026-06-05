package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.dto.ClassDto;
import com.kindergarden.recitation.dto.CreateStudentRequest;
import com.kindergarden.recitation.dto.StudentRecitationDto;
import com.kindergarden.recitation.dto.ToggleRequest;
import com.kindergarden.recitation.dto.UpdateStudentRequest;
import com.kindergarden.recitation.dto.UpdateTeacherRequest;
import com.kindergarden.recitation.dto.PersonProfileDto;
import com.kindergarden.recitation.service.RecitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RecitationController {

    private final RecitationService service;

    // 반 목록 — 프론트 상단 드롭다운용
    @GetMapping("/classes")
    public List<ClassDto> getClasses() {
        return service.listClasses();
    }

    // 특정 반의 학생 목록 + 오늘 암송 상태
    //   GET /api/classes/1/recitations?date=2026-04-19
    //   date 를 생략하면 서버의 오늘 날짜 사용.
    @GetMapping("/classes/{classId}/recitations")
    public List<StudentRecitationDto> getClassRecitations(
            @PathVariable Long classId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.getClassStatus(classId, date != null ? date : LocalDate.now());
    }

    // 교사: 담당 반에 학생 추가
    @PostMapping("/classes/{classId}/students")
    public StudentRecitationDto createStudent(
            @PathVariable Long classId,
            @RequestBody CreateStudentRequest body) {
        return service.createStudent(classId, body.name(), body.birthDate(), body.parentName());
    }

    @PutMapping("/teachers/{teacherId}")
    public PersonProfileDto updateTeacher(
            @PathVariable Long teacherId,
            @RequestBody UpdateTeacherRequest body) {
        return service.updateTeacher(teacherId, body.name());
    }

    @PutMapping("/students/{studentId}")
    public PersonProfileDto updateStudent(
            @PathVariable Long studentId,
            @RequestBody UpdateStudentRequest body) {
        return service.updateStudent(studentId, body.name(), body.birthDate(), body.parentName());
    }

    // 학생의 과별 암송/퀴즈 토글
    @PutMapping("/students/{studentId}/recitation")
    public StudentRecitationDto toggle(
            @PathVariable Long studentId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody ToggleRequest body) {
        return service.setRecitation(studentId, date != null ? date : LocalDate.now(), body.lessonNumber(), body.type(), body.success(), body.teacherId());
    }

    // 학생 1명의 오늘 기록 최종 제출
    @PostMapping("/students/{studentId}/submit")
    public StudentRecitationDto submitStudent(
            @PathVariable Long studentId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.submitStudent(studentId, date != null ? date : LocalDate.now());
    }

    // 관리자: 학생 1명의 오늘 최종 제출 잠금 해제
    @PostMapping("/admin/students/{studentId}/unlock")
    public StudentRecitationDto unlockStudentSubmission(
            @PathVariable Long studentId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.unlockStudentSubmission(studentId, date != null ? date : LocalDate.now());
    }

    // 관리자 대시보드 - 전체 반의 현황 조회
    @GetMapping("/admin/scores")
    public List<StudentRecitationDto> getAdminScores(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.getAllScores(date != null ? date : LocalDate.now());
    }

    // 관리자 프로필 관리 - 전체 교사/학생 프로필 조회
    @GetMapping("/admin/profiles")
    public List<com.kindergarden.recitation.dto.PersonProfileDto> getAllProfiles() {
        return service.listAllProfiles();
    }
}
