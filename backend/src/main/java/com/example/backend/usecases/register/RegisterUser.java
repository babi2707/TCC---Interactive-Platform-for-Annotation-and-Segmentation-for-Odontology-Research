package com.example.backend.usecases.register;

import com.example.backend.entities.User;
import com.example.backend.interfaces.IUserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class RegisterUser {
    private final IUserService userService;

    public User execute(String name, String email, String password, String role) {
        return userService.register(name, email, password, role);
    }
}
