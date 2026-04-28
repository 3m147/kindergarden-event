package com.kindergarden.recitation.controller;

import com.kindergarden.recitation.dto.AuthRequest;
import com.kindergarden.recitation.dto.AuthResponse;
import com.kindergarden.recitation.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginTeacher(@RequestBody AuthRequest request) {
        AuthResponse response = authService.loginTeacher(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body(response);
        }
    }

    @PostMapping("/admin/login")
    public ResponseEntity<AuthResponse> loginAdmin(@RequestBody AuthRequest request) {
        AuthResponse response = authService.loginAdmin(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body(response);
        }
    }
}
