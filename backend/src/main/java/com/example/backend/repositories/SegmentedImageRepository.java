package com.example.backend.repositories;

import com.example.backend.entities.Segmented_Image;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SegmentedImageRepository extends JpaRepository<Segmented_Image, Integer> {
    Optional<Segmented_Image> findByImageId(Long imageId);
}
