package com.example.backend.controllers;

import com.example.backend.entities.Annotation;
import com.example.backend.repositories.AnnotationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/annotation")
@RequiredArgsConstructor
public class AnnotationController {
    private final AnnotationRepository annotationRepository;

    @GetMapping("/{imageId}")
    public ResponseEntity<?> getAnnotationByImageId(@PathVariable Long imageId) {
        Optional<Annotation> annotationOpt = annotationRepository.findByImageId(imageId);

        if (annotationOpt.isPresent()) {
            return ResponseEntity.ok(annotationOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
