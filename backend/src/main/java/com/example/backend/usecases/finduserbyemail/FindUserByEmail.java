package com.example.backend.usecases.finduserbyemail;

import com.example.backend.interfaces.IUserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class FindUserByEmail {
    private final IUserService userService;

    public String execute(String email, String password) {
        return userService.login(email, password);
    }
}
