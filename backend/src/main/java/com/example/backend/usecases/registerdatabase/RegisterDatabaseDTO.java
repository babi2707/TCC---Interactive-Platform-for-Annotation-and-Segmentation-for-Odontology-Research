package com.example.backend.usecases.registerdatabase;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
public class RegisterDatabaseDTO {
    private String name;
    private Long userId;
    private List<MultipartFile> files;
}
