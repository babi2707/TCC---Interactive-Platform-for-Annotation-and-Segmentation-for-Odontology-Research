package com.example.backend.controllers;

import com.example.backend.entities.Annotation;
import com.example.backend.entities.Image;
import com.example.backend.repositories.AnnotationRepository;
import com.example.backend.repositories.ImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/annotation")
@RequiredArgsConstructor
public class AnnotationController {
    private final AnnotationRepository annotationRepository;
    private final ImageRepository imageRepository;

    @GetMapping("/{imageId}")
    public ResponseEntity<?> getAnnotationByImageId(@PathVariable Long imageId) {
        Optional<Annotation> annotationOpt = annotationRepository.findByImageId(imageId);

        if (annotationOpt.isPresent()) {
            Annotation annotation = annotationOpt.get();

            // Criar resposta padronizada
            Map<String, Object> response = Map.of(
                    "id", annotation.getId(),
                    "imageId", annotation.getImage().getId(),
                    "annotationData", annotation.getAnnotationData(),
                    "filePath", annotation.getFilePath(),
                    "createdAt", annotation.getCreatedAt(),
                    "updatedAt", annotation.getUpdatedAt()
            );

            return ResponseEntity.ok(response);
        } else {
            // Retornar objeto vazio em vez de 404
            Map<String, Object> emptyResponse = Map.of(
                    "annotationData", Map.of("brushStrokes", java.util.Collections.emptyList()),
                    "filePath", null,
                    "createdAt", null,
                    "updatedAt", null
            );
            return ResponseEntity.ok(emptyResponse);
        }
    }

    @PostMapping("/{imageId}/auto-save")
    public ResponseEntity<Map<String, Object>> autoSaveAnnotation(
            @PathVariable Long imageId,
            @RequestBody Map<String, Object> annotationData
    ) {
        try {
            // 1. Busca a imagem original
            Image image = imageRepository.findById(imageId)
                    .orElseThrow(() -> new RuntimeException("Imagem não encontrada com ID: " + imageId));

            // 2. Busca a anotação existente ou cria uma nova
            Annotation annotation = annotationRepository.findByImageId(imageId)
                    .orElse(new Annotation());

            // 3. Define os dados
            if (annotation.getId() == null) {
                annotation.setImage(image);
                annotation.setCreatedAt(LocalDateTime.now());
            }

            // 4. Atualiza apenas os dados que foram enviados (merge parcial)
            if (annotationData != null && !annotationData.isEmpty()) {
                Map<String, Object> currentData = annotation.getAnnotationData();

                if (currentData == null) {
                    // Se não existe dados anteriores, usa os novos
                    annotation.setAnnotationData(annotationData);
                } else {
                    // Faz merge dos dados (prioriza os novos)
                    currentData.putAll(annotationData);
                    annotation.setAnnotationData(currentData);
                }
            }

            annotation.setUpdatedAt(LocalDateTime.now());

            // 5. Salva no banco
            Annotation savedAnnotation = annotationRepository.save(annotation);

            log.info("✅ Auto-save realizado para imageId: {}", imageId);

            // 6. Retorna resposta de sucesso
            Map<String, Object> response = Map.of(
                    "status", "success",
                    "message", "Anotação salva automaticamente",
                    "savedAt", LocalDateTime.now().toString(),
                    "annotationId", savedAnnotation.getId()
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro no auto-save para imageId {}: {}", imageId, e.getMessage());

            Map<String, Object> errorResponse = Map.of(
                    "status", "error",
                    "message", "Falha no salvamento automático: " + e.getMessage()
            );

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PutMapping("/{imageId}/save")
    public ResponseEntity<Map<String, Object>> saveAnnotation(
            @PathVariable Long imageId,
            @RequestBody Map<String, Object> annotationData
    ) {
        try {
            Image image = imageRepository.findById(imageId)
                    .orElseThrow(() -> new RuntimeException("Imagem não encontrada com ID: " + imageId));

            Annotation annotation = annotationRepository.findByImageId(imageId)
                    .orElse(new Annotation());

            if (annotation.getId() == null) {
                annotation.setImage(image);
                annotation.setCreatedAt(LocalDateTime.now());
            }

            // Substitui completamente os dados
            annotation.setAnnotationData(annotationData);
            annotation.setUpdatedAt(LocalDateTime.now());

            Annotation savedAnnotation = annotationRepository.save(annotation);

            log.info("💾 Salvamento manual realizado para imageId: {}", imageId);

            Map<String, Object> response = Map.of(
                    "status", "success",
                    "message", "Anotação salva com sucesso",
                    "savedAt", LocalDateTime.now().toString(),
                    "annotationId", savedAnnotation.getId()
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Erro no salvamento manual para imageId {}: {}", imageId, e.getMessage());

            Map<String, Object> errorResponse = Map.of(
                    "status", "error",
                    "message", "Falha no salvamento: " + e.getMessage()
            );

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}