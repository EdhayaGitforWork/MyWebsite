package com.profile.mywebsite_backend.service;


import com.profile.mywebsite_backend.dto.response.UserResponse;
import com.profile.mywebsite_backend.entity.User;
import com.profile.mywebsite_backend.repository.UserRepository;
import com.profile.mywebsite_backend.security.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;


    public List<UserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();

        return users.stream()
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail()
                ))
                .toList();
    }

    public UserResponse getUserById(@Valid Long id) {

        //  Find user by id
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Record Not found"));

        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }

}
