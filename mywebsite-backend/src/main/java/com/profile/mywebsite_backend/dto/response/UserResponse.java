package com.profile.mywebsite_backend.dto.response;



public record UserResponse (
        Long id,
        String name,
        String email )
    // ✅ We never send the password back — ever!
{}
