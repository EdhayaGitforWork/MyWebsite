package com.profile.mywebsite_backend.service;

import com.profile.mywebsite_backend.dto.request.LoginRequest;
import com.profile.mywebsite_backend.dto.request.RegisterRequest;
import com.profile.mywebsite_backend.dto.response.AuthResponse;
import com.profile.mywebsite_backend.entity.User;
import com.profile.mywebsite_backend.repository.UserRepository;
import com.profile.mywebsite_backend.security.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;   // BCrypt
    private final JwtService jwtService;

    public AuthResponse register(@Valid RegisterRequest request) {

        // ✅ Step 1: Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // ✅ Step 2: Hash the password with BCrypt BEFORE saving
        //    "password123" → "$2a$12$eImiTXuWVxfM37uY4JANjQ..."
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // ✅ Step 3: Build and save the user
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(hashedPassword)   // HASHED — never plain text
                .build();

        userRepository.save(user);

        // ✅ Step 4: Generate JWT for immediate login after register
        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    public AuthResponse login(@Valid LoginRequest request) {

        // ✅ Step 1: Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        // ✅ Step 2: BCrypt compare — checks plain vs hashed automatically
        //    passwordEncoder.matches("password123", "$2a$12$eImi...") → true/false
        boolean passwordMatches = passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        );

        if (!passwordMatches) {
            // ✅ Same error message as "user not found" — don't reveal which failed!
            throw new RuntimeException("Invalid credentials");
        }

        // ✅ Step 3: Generate JWT
        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(token, user.getName(), user.getEmail());
    }
}
