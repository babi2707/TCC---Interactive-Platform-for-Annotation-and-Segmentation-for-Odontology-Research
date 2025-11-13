package com.example.backend.repositories;

import com.example.backend.entities.Segmented_Image;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SegmentedImageRepository extends JpaRepository<Segmented_Image, Integer> {
}
