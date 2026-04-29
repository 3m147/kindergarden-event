package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.entity.Student;
import com.kindergarden.recitation.entity.Teacher;
import com.kindergarden.recitation.repository.StudentRepository;
import com.kindergarden.recitation.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class ProfileController {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadProfile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type,
            @RequestParam("id") Long id) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("파일이 비어있습니다.");
        }

        try {
            // 업로드 디렉토리 생성
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 고유 파일명 생성
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                    ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
                    : ".jpg";
            String newFilename = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(newFilename);

            // 파일 저장
            file.transferTo(filePath.toAbsolutePath().toFile());
            
            // 파일 URL (로컬 서버 기준)
            String fileUrl = "http://localhost:8080/uploads/" + newFilename;

            // DB 업데이트
            if ("teacher".equals(type)) {
                Teacher teacher = teacherRepository.findById(id).orElseThrow();
                teacher.setPhotoUrl(fileUrl);
                teacherRepository.save(teacher);
            } else if ("student".equals(type)) {
                Student student = studentRepository.findById(id).orElseThrow();
                student.setPhotoUrl(fileUrl);
                studentRepository.save(student);
            } else {
                return ResponseEntity.badRequest().body("알 수 없는 타입: " + type);
            }

            return ResponseEntity.ok(Map.of("url", fileUrl));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("파일 저장 실패: " + e.getMessage());
        }
    }
}
