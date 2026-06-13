package com.kindergarden.recitation.service;

import com.kindergarden.recitation.entity.FoundationMaterial;
import com.kindergarden.recitation.entity.ScheduleImage;
import com.kindergarden.recitation.entity.StoredFile;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
        when(storage.createReadUri(any(), any(Duration.class))).thenReturn(URI.create("https://signed.example/file"));
        when(storedFileRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
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

    private MockMultipartFile imageFile() {
        return new MockMultipartFile("file", "new.jpg", "image/jpeg", "image".getBytes());
    }

    private MockMultipartFile pdfFile() {
        return new MockMultipartFile("file", "new.pdf", "application/pdf", "pdf".getBytes());
    }
}
