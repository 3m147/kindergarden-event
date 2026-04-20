package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.dto.ClassDto;
import com.kindergarden.recitation.dto.StudentRecitationDto;
import com.kindergarden.recitation.dto.ToggleRequest;
import com.kindergarden.recitation.service.RecitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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

    // 학생의 오늘 암송 상태 저장/수정 (토글 결과를 그대로 전달)
    @PutMapping("/students/{studentId}/recitation")
    public StudentRecitationDto toggle(
            @PathVariable Long studentId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody ToggleRequest body) {
        return service.setRecitation(studentId, date != null ? date : LocalDate.now(), body.success());
    }

    // 반의 오늘 기록 최종 제출
    @PostMapping("/classes/{classId}/submit")
    public Map<String, Object> submit(
            @PathVariable Long classId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        int updated = service.submitClass(classId, target);
        return Map.of("classId", classId, "date", target.toString(), "updated", updated);
    }
}
