package com.profile.mywebsite_backend.repository;


import com.profile.mywebsite_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Spring Data JPA auto-implements this from the method name!
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
