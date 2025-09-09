package com.example.backend.usecases.finduserbyemail;

import com.example.backend.interfaces.IUserService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class FindUserByEmail {
    private final IUserService userService;

    public ResponseEntity<?> execute(String email, String password) {
        return userService.login(email, password);
    }
}
