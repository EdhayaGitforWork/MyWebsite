package com.profile.mywebsite_backend.security;


import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    // ✅ Generate a JWT token for a given email
    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)                             // who this token is for
                .setIssuedAt(new Date())                       // when it was created
                .setExpiration(new Date(System.currentTimeMillis() + expiration)) // when it expires
                .signWith(getSigningKey(), SignatureAlgorithm.HS256) // sign with our secret
                .compact();
    }

    // ✅ Extract the email (subject) from a token
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    // ✅ Check if token is valid and not expired
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token); // throws if invalid or expired
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
}