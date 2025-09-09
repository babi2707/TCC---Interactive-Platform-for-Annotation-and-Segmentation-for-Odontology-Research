package com.example.backend.interfaces;

import com.example.backend.entities.User;
import org.springframework.http.ResponseEntity;

public interface IUserService {
    User register(String name, String email, String passwordHash, String role);
    ResponseEntity<?> login(String email, String password);
}
