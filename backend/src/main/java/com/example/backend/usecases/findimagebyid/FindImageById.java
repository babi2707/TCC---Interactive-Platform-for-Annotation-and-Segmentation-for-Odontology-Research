package com.example.backend.usecases.findimagebyid;

import com.example.backend.entities.Image;
import com.example.backend.interfaces.IImageService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@AllArgsConstructor
public class FindImageById {
    private IImageService imageService;

    public Optional<Image> execute(Long imageId) {
        return imageService.findImageById(imageId);
    }
}
