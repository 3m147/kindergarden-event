package com.kindergarden.recitation.service;

import com.kindergarden.recitation.entity.FoundationMaterial;
import com.kindergarden.recitation.entity.LessonVideo;
import com.kindergarden.recitation.entity.ScheduleImage;
import com.kindergarden.recitation.entity.StoredFile;
import com.kindergarden.recitation.entity.WeeklyPhoto;
import com.kindergarden.recitation.dto.LessonVideoDto;
import com.kindergarden.recitation.repository.FoundationMaterialRepository;
import com.kindergarden.recitation.repository.LessonVideoRepository;
import com.kindergarden.recitation.repository.NoticeRepository;
import com.kindergarden.recitation.repository.ScheduleImageRepository;
import com.kindergarden.recitation.repository.StoredFileRepository;
import com.kindergarden.recitation.repository.WeeklyPhotoRepository;
import com.kindergarden.recitation.storage.PrivateFileStorage;
import com.kindergarden.recitation.storage.StoredObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedContentServiceTest {
    @Mock PrivateFileStorage storage;
    @Mock StoredFileRepository storedFileRepository;
    @Mock WeeklyPhotoRepository weeklyPhotoRepository;
    @Mock ScheduleImageRepository scheduleImageRepository;
    @Mock FoundationMaterialRepository foundationMaterialRepository;
    @Mock NoticeRepository noticeRepository;
    @Mock LessonVideoRepository lessonVideoRepository;

    private SharedContentService service;

    @BeforeEach
    void setUp() {
        service = new SharedContentService(
                storage,
                storedFileRepository,
                weeklyPhotoRepository,
                scheduleImageRepository,
                foundationMaterialRepository,
                noticeRepository,
                lessonVideoRepository
        );
        ReflectionTestUtils.setField(service, "signedUrlMinutes", 15L);
        lenient().when(storage.createReadUri(any(), any(Duration.class))).thenReturn(URI.create("https://signed.example/file"));
        lenient().when(storedFileRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void newlyUploadedScheduleBecomesTheOnlyActiveSchedule() {
        ScheduleImage previous = ScheduleImage.builder().active(true).build();
        when(scheduleImageRepository.findAll()).thenReturn(List.of(previous));
        when(scheduleImageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(storage.upload(any(), any())).thenReturn(new StoredObject("schedule/new.jpg", "new.jpg", "image/jpeg", 10));

        var created = service.createScheduleImage("새 계획표", imageFile(), 1L, "ADMIN");

        assertThat(previous.isActive()).isFalse();
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void newlyUploadedFoundationBecomesTheOnlyActiveFoundation() {
        FoundationMaterial previous = FoundationMaterial.builder().active(true).build();
        when(foundationMaterialRepository.findAll()).thenReturn(List.of(previous));
        when(foundationMaterialRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(storage.upload(any(), any())).thenReturn(new StoredObject("foundation/new.pdf", "new.pdf", "application/pdf", 10));

        var created = service.createFoundationMaterial("새 머릿돌", pdfFile(), 1L, "ADMIN");

        assertThat(previous.isActive()).isFalse();
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void acceptsOffsetTimestampWhenReplacingLessonVideos() {
        when(lessonVideoRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(lessonVideoRepository.findAllByOrderByLessonNumberAsc()).thenReturn(List.of());

        service.replaceLessonVideos(List.of(new LessonVideoDto(
                null,
                1,
                "1과 친구야 안녕",
                "https://youtu.be/ZNTtW3CCioo",
                "ZNTtW3CCioo",
                "우병수 목사",
                "",
                "2026-01-04T00:00:00.000+09:00"
        )));

        var lessonCaptor = org.mockito.ArgumentCaptor.forClass(List.class);
        org.mockito.Mockito.verify(lessonVideoRepository).saveAll(lessonCaptor.capture());
        LessonVideo saved = (LessonVideo) lessonCaptor.getValue().get(0);
        assertThat(saved.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 1, 4, 0, 0));
    }

    @Test
    void deletesWeeklyPhotoBeforeRemovingStoredFile() {
        StoredFile file = StoredFile.builder().objectKey("weekly/photo.jpg").build();
        WeeklyPhoto photo = WeeklyPhoto.builder().file(file).build();
        when(weeklyPhotoRepository.findById(1L)).thenReturn(Optional.of(photo));

        service.deleteWeeklyPhoto(1L);

        InOrder inOrder = inOrder(weeklyPhotoRepository, storage, storedFileRepository);
        inOrder.verify(weeklyPhotoRepository).delete(photo);
        inOrder.verify(weeklyPhotoRepository).flush();
        inOrder.verify(storage).delete("weekly/photo.jpg");
        inOrder.verify(storedFileRepository).delete(file);
    }

    private MockMultipartFile imageFile() {
        return new MockMultipartFile("file", "new.jpg", "image/jpeg", "image".getBytes());
    }

    private MockMultipartFile pdfFile() {
        return new MockMultipartFile("file", "new.pdf", "application/pdf", "pdf".getBytes());
    }
}
