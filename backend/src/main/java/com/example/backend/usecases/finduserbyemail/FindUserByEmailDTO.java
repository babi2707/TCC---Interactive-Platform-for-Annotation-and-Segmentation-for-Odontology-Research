package com.example.backend.usecases.finduserbyemail;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FindUserByEmailDTO {
    private String email;
    private String password;
}
