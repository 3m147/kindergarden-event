package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.entity.Student;
import com.kindergarden.recitation.entity.Teacher;
import com.kindergarden.recitation.repository.StudentRepository;
import com.kindergarden.recitation.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import com.kindergarden.recitation.storage.PrivateFileStorage;
import com.kindergarden.recitation.storage.StoredFileCategory;
import com.kindergarden.recitation.storage.StoredObject;
import com.kindergarden.recitation.service.SharedContentService;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final PrivateFileStorage storage;
    private final SharedContentService sharedContentService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadProfile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type,
            @RequestParam("id") Long id) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("파일이 비어있습니다.");
        }

        StoredObject object = storage.upload(StoredFileCategory.PROFILE, file);
        try {
            String previousReference;
            if ("teacher".equals(type)) {
                Teacher teacher = teacherRepository.findById(id).orElseThrow();
                previousReference = teacher.getPhotoUrl();
                teacher.setPhotoUrl(object.objectKey());
                teacherRepository.save(teacher);
            } else if ("student".equals(type)) {
                Student student = studentRepository.findById(id).orElseThrow();
                previousReference = student.getPhotoUrl();
                student.setPhotoUrl(object.objectKey());
                studentRepository.save(student);
            } else {
                storage.delete(object.objectKey());
                return ResponseEntity.badRequest().body("알 수 없는 타입: " + type);
            }

            if (previousReference != null && !previousReference.matches("^(https?://|data:|blob:).*")) {
                storage.delete(previousReference);
            }
            return ResponseEntity.ok(Map.of("url", sharedContentService.readUrl(object.objectKey())));
        } catch (RuntimeException e) {
            storage.delete(object.objectKey());
            throw e;
        }
    }
}
