package com.example.backend.services;

import com.example.backend.entities.Database;
import com.example.backend.entities.Image;
import com.example.backend.interfaces.IDatabaseService;
import com.example.backend.repositories.DatabaseRepository;
import com.example.backend.repositories.ImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DatabaseService implements IDatabaseService {
    private final DatabaseRepository databaseRepository;
    private final ImageRepository imageRepository;

    @Override
    public Database createDatabase(String name, Long userId, List<Long> imageIds) {
        if (databaseRepository.findByName(name).isPresent()) {
            throw new RuntimeException("A Database with this name already exists.");
        }

        Database database = new Database(userId, name);
        List<Image> images = imageRepository.findByIdIn(imageIds);

        for (Image image : images) {
            image.setDatabase(database);
        }

        database.getImages().addAll(images);
        database.setCreatedAt(LocalDateTime.now());
        database.setUpdatedAt(LocalDateTime.now());

        return  databaseRepository.save(database);
    }
}
