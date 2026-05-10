package com.profile.mywebsite_backend.controller;

import com.profile.mywebsite_backend.dto.request.LoginRequest;
import com.profile.mywebsite_backend.dto.request.RegisterRequest;
import com.profile.mywebsite_backend.dto.response.AuthResponse;
import com.profile.mywebsite_backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "http://frontend-edhaya-anbalagan-dev.apps.rm1.0a51.p1.openshiftapps.com")
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}