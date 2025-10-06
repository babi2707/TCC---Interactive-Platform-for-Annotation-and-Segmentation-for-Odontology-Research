package com.example.backend.interfaces;

import com.example.backend.entities.Image;

import java.util.List;
import java.util.Optional;

public interface IImageService {
    List<Image> findAllImagesByDatabase(Long databaseId);
    Optional<Image> findImageById(Long imageId);
}
