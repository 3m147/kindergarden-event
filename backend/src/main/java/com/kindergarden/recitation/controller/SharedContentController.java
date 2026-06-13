package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.dto.*;
import com.kindergarden.recitation.service.SharedContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SharedContentController {
    private final SharedContentService service;

    @GetMapping("/api/content/weekly-photos") public List<WeeklyPhotoDto> weeklyPhotos() { return service.weeklyPhotos(); }
    @GetMapping("/api/content/schedule-images") public List<ScheduleImageDto> schedules() { return service.scheduleImages(); }
    @GetMapping("/api/content/foundation-materials") public List<FoundationMaterialDto> foundations() { return service.foundationMaterials(); }
    @GetMapping("/api/content/notices") public List<NoticeDto> notices() { return service.notices(false); }
    @GetMapping("/api/content/lesson-videos") public List<LessonVideoDto> lessons() { return service.lessonVideos(); }
    @GetMapping("/api/admin/content/notices") public List<NoticeDto> adminNotices() { return service.notices(true); }

    @PostMapping("/api/admin/content/weekly-photos")
    public WeeklyPhotoDto addWeekly(@RequestParam(required = false) String title, @RequestParam MultipartFile file, @org.springframework.security.core.annotation.AuthenticationPrincipal Jwt jwt) {
        return service.createWeeklyPhoto(title, file, jwt.getClaim("userId"), "ADMIN");
    }
    @DeleteMapping("/api/admin/content/weekly-photos/{id}") public void deleteWeekly(@PathVariable Long id) { service.deleteWeeklyPhoto(id); }
    @PostMapping("/api/admin/content/schedule-images")
    public ScheduleImageDto addSchedule(@RequestParam(required = false) String title, @RequestParam MultipartFile file, @org.springframework.security.core.annotation.AuthenticationPrincipal Jwt jwt) {
        return service.createScheduleImage(title, file, jwt.getClaim("userId"), "ADMIN");
    }
    @PutMapping("/api/admin/content/schedule-images/{id}/active") public ScheduleImageDto activateSchedule(@PathVariable Long id) { return service.activateScheduleImage(id); }
    @DeleteMapping("/api/admin/content/schedule-images/{id}") public void deleteSchedule(@PathVariable Long id) { service.deleteScheduleImage(id); }
    @PostMapping("/api/admin/content/foundation-materials")
    public FoundationMaterialDto addFoundation(@RequestParam(required = false) String title, @RequestParam MultipartFile file, @org.springframework.security.core.annotation.AuthenticationPrincipal Jwt jwt) {
        return service.createFoundationMaterial(title, file, jwt.getClaim("userId"), "ADMIN");
    }
    @PutMapping("/api/admin/content/foundation-materials/{id}/active") public FoundationMaterialDto activateFoundation(@PathVariable Long id) { return service.activateFoundationMaterial(id); }
    @DeleteMapping("/api/admin/content/foundation-materials/{id}") public void deleteFoundation(@PathVariable Long id) { service.deleteFoundationMaterial(id); }
    @PostMapping("/api/admin/content/notices") public NoticeDto addNotice(@RequestBody CreateNoticeRequest request) { return service.createNotice(request); }
    @DeleteMapping("/api/admin/content/notices/{id}") public void deleteNotice(@PathVariable Long id) { service.deleteNotice(id); }
    @PutMapping("/api/admin/content/lesson-videos") public List<LessonVideoDto> replaceLessons(@RequestBody List<LessonVideoDto> videos) { return service.replaceLessonVideos(videos); }
}
