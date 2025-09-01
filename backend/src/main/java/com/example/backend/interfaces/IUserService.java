package com.example.backend.interfaces;

import com.example.backend.entities.User;

public interface IUserService {
    User register(String name, String email, String passwordHash, String role);
    String login(String email, String password);
}
