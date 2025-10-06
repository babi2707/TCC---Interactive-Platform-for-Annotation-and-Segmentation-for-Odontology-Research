package com.example.backend.interfaces;

import com.example.backend.entities.Database;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IDatabaseService {
    Database createDatabase(String name, Long userId, List<MultipartFile> imageIds);
    List<Database> findAllDatabases();
    void deleteDatabase(Long databaseId);
}
