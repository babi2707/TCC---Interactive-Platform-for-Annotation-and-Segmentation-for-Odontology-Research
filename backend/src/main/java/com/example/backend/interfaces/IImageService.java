package com.example.backend.interfaces;

import com.example.backend.entities.Image;

import java.util.List;

public interface IImageService {
    List<Image> findAllImagesByDatabase(Long databaseId);
}
