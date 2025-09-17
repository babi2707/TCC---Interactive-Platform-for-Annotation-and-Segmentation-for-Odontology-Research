package com.example.backend.usecases.registerdatabase;

import com.example.backend.entities.Database;
import com.example.backend.interfaces.IDatabaseService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Component
@AllArgsConstructor
public class RegisterDatabase {
    private final IDatabaseService databaseService;

    public Database execute(String name, Long userId, List<MultipartFile> imageIds) {
        return databaseService.createDatabase(name, userId, imageIds);
    }
}
