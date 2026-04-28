package com.kindergarden.recitation.service;

import com.kindergarden.recitation.dto.AuthRequest;
import com.kindergarden.recitation.dto.AuthResponse;
import com.kindergarden.recitation.entity.Admin;
import com.kindergarden.recitation.entity.Teacher;
import com.kindergarden.recitation.repository.AdminRepository;
import com.kindergarden.recitation.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TeacherRepository teacherRepository;
    private final AdminRepository adminRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthResponse loginTeacher(AuthRequest request) {
        Optional<Teacher> opt = teacherRepository.findByLoginId(request.getLoginId());
        if (opt.isEmpty() || !passwordEncoder.matches(request.getPassword(), opt.get().getPassword())) {
            return AuthResponse.builder().success(false).message("아이디 또는 비밀번호가 잘못되었습니다.").build();
        }

        Teacher teacher = opt.get();
        return AuthResponse.builder()
                .success(true)
                .id(teacher.getId())
                .name(teacher.getName())
                .role(teacher.getRole())
                .classId(teacher.getClassEntity().getId())
                .className(teacher.getClassEntity().getName())
                .photoUrl(teacher.getPhotoUrl())
                .build();
    }

    public AuthResponse loginAdmin(AuthRequest request) {
        Optional<Admin> opt = adminRepository.findByLoginId(request.getLoginId());
        if (opt.isEmpty() || !passwordEncoder.matches(request.getPassword(), opt.get().getPassword())) {
            return AuthResponse.builder().success(false).message("아이디 또는 비밀번호가 잘못되었습니다.").build();
        }

        Admin admin = opt.get();
        return AuthResponse.builder()
                .success(true)
                .id(admin.getId())
                .name(admin.getName())
                .role("관리자")
                .build();
    }
}
