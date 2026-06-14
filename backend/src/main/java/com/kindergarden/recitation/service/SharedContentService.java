package com.kindergarden.recitation.service;

import com.kindergarden.recitation.dto.*;
import com.kindergarden.recitation.entity.*;
import com.kindergarden.recitation.repository.*;
import com.kindergarden.recitation.storage.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SharedContentService {
    private final PrivateFileStorage storage;
    private final StoredFileRepository storedFileRepository;
    private final WeeklyPhotoRepository weeklyPhotoRepository;
    private final ScheduleImageRepository scheduleImageRepository;
    private final FoundationMaterialRepository foundationMaterialRepository;
    private final NoticeRepository noticeRepository;
    private final LessonVideoRepository lessonVideoRepository;

    @Value("${app.storage.signed-url-minutes:15}")
    private long signedUrlMinutes;

    @Transactional(readOnly = true)
    public List<WeeklyPhotoDto> weeklyPhotos() { return weeklyPhotoRepository.findAllByOrderByCreatedAtDesc().stream().map(this::weeklyDto).toList(); }
    @Transactional(readOnly = true)
    public List<ScheduleImageDto> scheduleImages() { return scheduleImageRepository.findAllByOrderByCreatedAtDesc().stream().map(this::scheduleDto).toList(); }
    @Transactional(readOnly = true)
    public List<FoundationMaterialDto> foundationMaterials() { return foundationMaterialRepository.findAllByOrderByCreatedAtDesc().stream().map(this::foundationDto).toList(); }
    @Transactional(readOnly = true)
    public List<NoticeDto> notices(boolean admin) {
        return (admin ? noticeRepository.findAllByOrderByCreatedAtDesc() : noticeRepository.findByShowToTeachersTrueOrderByCreatedAtDesc())
                .stream().map(this::noticeDto).toList();
    }
    @Transactional(readOnly = true)
    public List<LessonVideoDto> lessonVideos() { return lessonVideoRepository.findAllByOrderByLessonNumberAsc().stream().map(this::lessonDto).toList(); }

    @Transactional
    public WeeklyPhotoDto createWeeklyPhoto(String title, MultipartFile multipart, Long creatorId, String creatorType) {
        StoredFile file = store(StoredFileCategory.WEEKLY_PHOTO, multipart, creatorId, creatorType);
        try {
            return weeklyDto(weeklyPhotoRepository.save(WeeklyPhoto.builder().title(title(title, file)).file(file).build()));
        } catch (RuntimeException e) {
            cleanup(file);
            throw e;
        }
    }

    @Transactional
    public ScheduleImageDto createScheduleImage(String title, MultipartFile multipart, Long creatorId, String creatorType) {
        StoredFile file = store(StoredFileCategory.SCHEDULE_IMAGE, multipart, creatorId, creatorType);
        try {
            scheduleImageRepository.findAll().forEach(item -> item.setActive(false));
            return scheduleDto(scheduleImageRepository.save(ScheduleImage.builder().title(title(title, file)).file(file).active(true).build()));
        } catch (RuntimeException e) {
            cleanup(file);
            throw e;
        }
    }

    @Transactional
    public FoundationMaterialDto createFoundationMaterial(String title, MultipartFile multipart, Long creatorId, String creatorType) {
        StoredFile file = store(StoredFileCategory.FOUNDATION_PDF, multipart, creatorId, creatorType);
        try {
            foundationMaterialRepository.findAll().forEach(item -> item.setActive(false));
            return foundationDto(foundationMaterialRepository.save(FoundationMaterial.builder().title(title(title, file)).file(file).active(true).build()));
        } catch (RuntimeException e) {
            cleanup(file);
            throw e;
        }
    }

    @Transactional
    public NoticeDto createNotice(CreateNoticeRequest request) {
        if (request.title() == null || request.title().isBlank() || request.content() == null || request.content().isBlank()) {
            throw new IllegalArgumentException("공지 제목과 내용을 입력해 주세요.");
        }
        return noticeDto(noticeRepository.save(Notice.builder().title(request.title().trim()).content(request.content().trim()).showToTeachers(request.showToTeachers()).build()));
    }

    @Transactional
    public List<LessonVideoDto> replaceLessonVideos(List<LessonVideoDto> videos) {
        lessonVideoRepository.deleteAll();
        lessonVideoRepository.saveAll(videos.stream().map(v -> LessonVideo.builder()
                .lessonNumber(v.lessonNumber()).title(v.title()).url(v.url()).videoId(v.videoId())
                .pastor(v.pastor()).description(v.description()).createdAt(parseCreatedAt(v.createdAt())).build()).toList());
        return lessonVideos();
    }

    @Transactional public void deleteWeeklyPhoto(Long id) { WeeklyPhoto v = weeklyPhotoRepository.findById(id).orElseThrow(); deleteFileBacked(v, p -> weeklyPhotoRepository.delete((WeeklyPhoto) p), v.getFile()); }
    @Transactional public void deleteScheduleImage(Long id) { ScheduleImage v = scheduleImageRepository.findById(id).orElseThrow(); deleteFileBacked(v, p -> scheduleImageRepository.delete((ScheduleImage) p), v.getFile()); }
    @Transactional public void deleteFoundationMaterial(Long id) { FoundationMaterial v = foundationMaterialRepository.findById(id).orElseThrow(); deleteFileBacked(v, p -> foundationMaterialRepository.delete((FoundationMaterial) p), v.getFile()); }
    @Transactional public void deleteNotice(Long id) { noticeRepository.deleteById(id); }

    @Transactional
    public ScheduleImageDto activateScheduleImage(Long id) {
        scheduleImageRepository.findAll().forEach(item -> item.setActive(false));
        ScheduleImage target = scheduleImageRepository.findById(id).orElseThrow();
        target.setActive(true);
        return scheduleDto(target);
    }

    @Transactional
    public FoundationMaterialDto activateFoundationMaterial(Long id) {
        foundationMaterialRepository.findAll().forEach(item -> item.setActive(false));
        FoundationMaterial target = foundationMaterialRepository.findById(id).orElseThrow();
        target.setActive(true);
        return foundationDto(target);
    }

    public String readUrl(String objectKey) { return storage.createReadUri(objectKey, Duration.ofMinutes(signedUrlMinutes)).toString(); }

    private StoredFile store(StoredFileCategory category, MultipartFile multipart, Long creatorId, String creatorType) {
        StoredObject object = storage.upload(category, multipart);
        try {
            return storedFileRepository.save(StoredFile.builder().objectKey(object.objectKey()).originalFileName(object.originalFileName())
                    .contentType(object.contentType()).sizeBytes(object.sizeBytes()).category(category)
                    .createdById(creatorId).createdByType(creatorType).build());
        } catch (RuntimeException e) {
            storage.delete(object.objectKey());
            throw e;
        }
    }

    private void cleanup(StoredFile file) { storage.delete(file.getObjectKey()); storedFileRepository.delete(file); }
    private void deleteFileBacked(Object entity, java.util.function.Consumer<Object> deleter, StoredFile file) { deleter.accept(entity); cleanup(file); }
    private String title(String requested, StoredFile file) { return requested == null || requested.isBlank() ? file.getOriginalFileName() : requested.trim(); }
    private WeeklyPhotoDto weeklyDto(WeeklyPhoto v) { return new WeeklyPhotoDto(v.getId(), v.getTitle(), readUrl(v.getFile().getObjectKey()), v.getCreatedAt()); }
    private ScheduleImageDto scheduleDto(ScheduleImage v) { return new ScheduleImageDto(v.getId(), v.getTitle(), readUrl(v.getFile().getObjectKey()), v.getFile().getOriginalFileName(), v.getCreatedAt(), v.isActive()); }
    private FoundationMaterialDto foundationDto(FoundationMaterial v) { return new FoundationMaterialDto(v.getId(), v.getTitle(), v.getFile().getOriginalFileName(), readUrl(v.getFile().getObjectKey()), v.getCreatedAt(), v.isActive()); }
    private NoticeDto noticeDto(Notice v) { return new NoticeDto(v.getId(), v.getTitle(), v.getContent(), v.getCreatedAt(), v.isShowToTeachers()); }
    private LessonVideoDto lessonDto(LessonVideo v) { return new LessonVideoDto(v.getId(), v.getLessonNumber(), v.getTitle(), v.getUrl(), v.getVideoId(), v.getPastor(), v.getDescription(), v.getCreatedAt() == null ? null : v.getCreatedAt().toString()); }

    private LocalDateTime parseCreatedAt(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return OffsetDateTime.parse(value).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.parse(value);
        }
    }
}
