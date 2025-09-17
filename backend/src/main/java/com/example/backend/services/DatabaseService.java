package com.example.backend.services;

import com.example.backend.entities.Database;
import com.example.backend.entities.Image;
import com.example.backend.interfaces.IDatabaseService;
import com.example.backend.repositories.DatabaseRepository;
import com.example.backend.repositories.ImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DatabaseService implements IDatabaseService {
    private final DatabaseRepository databaseRepository;
    private final ImageRepository imageRepository;

    private static final String UPLOAD_DIR = "uploads/";

    @Override
    public Database createDatabase(String name, Long userId, List<MultipartFile> imageIds) {
        if (databaseRepository.findByName(name).isPresent()) {
            throw new RuntimeException("A Database with this name already exists.");
        }

        Database database = new Database(userId, name);
        database.setCreatedAt(LocalDateTime.now());
        database.setUpdatedAt(LocalDateTime.now());

        database = databaseRepository.save(database);

        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }

        List<Image> images = new ArrayList<>();

        for (MultipartFile file : imageIds) {
            try {
                String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                Path filePath = Paths.get(UPLOAD_DIR + filename);

                Files.copy(file.getInputStream(), filePath);

                Image image = new Image();
                image.setDatabase(database);
                image.setFile_path(filePath.toString());
                image.setEdited(false);
                image.setCreatedAt(LocalDateTime.now());
                image.setUpdatedAt(LocalDateTime.now());

                images.add(image);
            } catch (IOException e) {
                throw new RuntimeException("Failed to save file: " + file.getOriginalFilename(), e);
            }
        }

        imageRepository.saveAll(images);
        database.getImages().addAll(images);

        return database;
    }

    @Override
    public List<Database> findAllDatabases() {
        return databaseRepository.findAll();
    }
}
