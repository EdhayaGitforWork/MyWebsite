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
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        System.out.println("Entering Register for email "+ request.getEmail());
        return ResponseEntity.ok(authService.register(request));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        System.out.println("Entering Register for email "+ request.getEmail());
        return ResponseEntity.ok(authService.login(request));
    }


}
