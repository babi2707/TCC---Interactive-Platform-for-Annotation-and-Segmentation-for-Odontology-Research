package com.example.backend.controllers;

import com.example.backend.entities.User;
import com.example.backend.usecases.finduserbyemail.FindUserByEmail;
import com.example.backend.usecases.finduserbyemail.FindUserByEmailDTO;
import com.example.backend.usecases.register.RegisterDTO;
import com.example.backend.usecases.register.RegisterUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final RegisterUser registerUser;
    private final FindUserByEmail findUserByEmail;

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody RegisterDTO userDTO) {
        User user = registerUser.execute(userDTO.getName(), userDTO.getEmail(), userDTO.getPassword(), userDTO.getRole());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody FindUserByEmailDTO userDTO) {
        String result = findUserByEmail.execute(userDTO.getEmail(), userDTO.getPassword());
        return ResponseEntity.ok(result);
    }
}
