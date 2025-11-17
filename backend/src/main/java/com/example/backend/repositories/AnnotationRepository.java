package com.example.backend.repositories;

import com.example.backend.entities.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnnotationRepository extends JpaRepository<Annotation, Integer> {
    Optional<Annotation> findByImageId(Long imageId);
}
