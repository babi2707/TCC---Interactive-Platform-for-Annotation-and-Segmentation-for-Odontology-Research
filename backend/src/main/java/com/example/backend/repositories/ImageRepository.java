package com.example.backend.repositories;

import com.example.backend.entities.Image;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImageRepository extends JpaRepository<Image, Long> {
    List<Image> findByIdIn(List<Long> ids);
}

