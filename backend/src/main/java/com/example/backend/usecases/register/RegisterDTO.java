package com.example.backend.usecases.register;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterDTO {
    private String name;
    private String email;
    private String password;
    private String role;
}
