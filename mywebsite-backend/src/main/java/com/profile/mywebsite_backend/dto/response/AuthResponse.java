package com.profile.mywebsite_backend.dto.response;



public record AuthResponse(
        String token,
        String name,
        String email
) {}
