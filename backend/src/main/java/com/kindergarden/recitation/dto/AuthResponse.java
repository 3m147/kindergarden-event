package com.kindergarden.recitation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class AuthResponse {
    private boolean success;
    private Long id;
    private String name;
    private String role;
    private Long classId;
    private String className;
    private String photoUrl;
    private String token;
    private String message;
}
