package com.example.backend.usecases.findallimagesbydatabase;

import com.example.backend.entities.Image;
import com.example.backend.interfaces.IImageService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@AllArgsConstructor
public class FindAllImagesByDatabase {
    private final IImageService imageService;

    public List<Image> execute (Long databaseId) {
        return imageService.findAllImagesByDatabase(databaseId);
    }
}
