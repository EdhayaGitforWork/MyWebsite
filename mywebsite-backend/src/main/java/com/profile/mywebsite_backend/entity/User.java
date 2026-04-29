package com.profile.mywebsite_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data                  // Lombok: generates getters, setters, toString
@NoArgsConstructor     // Lombok: generates no-arg constructor
@AllArgsConstructor    // Lombok: generates all-arg constructor
@Builder               // Lombok: builder pattern
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;   // ✅ This will be BCrypt hashed — NEVER plain text

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist  // runs automatically before saving to DB
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}