package com.example.backend.services;

import com.example.backend.entities.Image;
import com.example.backend.interfaces.IImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ImageService implements IImageService {

    @Override
    public List<Image> findAllImagesByDatabase(Long databaseId) {
        return null;
    }
}
