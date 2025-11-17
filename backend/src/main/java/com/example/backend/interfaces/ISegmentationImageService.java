package com.example.backend.interfaces;

import com.example.backend.entities.Segmented_Image;

import java.util.Optional;

public interface ISegmentationImageService {
    Optional<Segmented_Image> findSegmentationImageByImageId(Long imageId);
}
