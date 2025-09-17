package com.example.backend.usecases.registerdatabase;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class RegisterDatabaseDTO {
    private String name;
    private Long userId;
    private List<Long> imageIds;
}
