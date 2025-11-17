package com.example.backend.controllers;

import com.example.backend.entities.Image;
import com.example.backend.services.GradCamMarkerService;
import com.example.backend.services.SegmentationService;
import com.example.backend.usecases.findallimagesbydatabase.FindAllImagesByDatabase;
import com.example.backend.usecases.findimagebyid.FindImageById;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/image")
@RequiredArgsConstructor
public class ImageController {

    private final FindAllImagesByDatabase findAllImagesByDatabase;
    private final FindImageById findImageById;

    @Autowired
    private SegmentationService segmentationService;

    @Autowired
    private GradCamMarkerService gradCamMarkerService;

    @GetMapping(value = "/findAllByDatabase")
    public ResponseEntity<List<Image>> getAllImagesByDatabase(@RequestParam Long databaseId) {
        List<Image> images = findAllImagesByDatabase.execute(databaseId);
        return ResponseEntity.ok(images);
    }

    @GetMapping(value = "/findImageById")
    public ResponseEntity<Optional<Image>> getImageById(@RequestParam Long imageId) {
        Optional<Image> image = findImageById.execute(imageId);
        return ResponseEntity.ok(image);
    }

    @PostMapping("/segment")
    public ResponseEntity<Map<String, Object>> segmentImage(
            @RequestParam("image") MultipartFile imageFile,
            @RequestParam("markers") MultipartFile markersFile,
            @RequestParam("imageId") Long imageId
    ) {
        Map<String, Object> response = new HashMap<>();

        try {
            File uploadsDir = new File("uploads/");
            uploadsDir.mkdirs();

            String imagePath = Paths.get(uploadsDir.getAbsolutePath(), imageFile.getOriginalFilename()).toString();
            String markersPath = Paths.get(uploadsDir.getAbsolutePath(), "markers_" + imageFile.getOriginalFilename()).toString();

            imageFile.transferTo(new File(imagePath));
            markersFile.transferTo(new File(markersPath));

            String segmentedUrl = segmentationService.runAutomaticSegmentation(imagePath, markersPath, imageId);

            response.put("status", "success");
            response.put("segmentedImageUrl", segmentedUrl);
            return ResponseEntity.ok(response);

        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
            response.put("status", "error");
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        } catch (IllegalArgumentException e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/generate-initial-markers")
    public ResponseEntity<Map<String, Object>> generateInitialMarkers(
            @RequestParam("image") MultipartFile imageFile,
            @RequestParam("imageId") Long imageId
    ) {
        Map<String, Object> response = new HashMap<>();
        File tempFile = null;

        try {
            // Criar diretório temporário
            File uploadsDir = new File("uploads/");
            uploadsDir.mkdirs();

            // Salvar imagem temporariamente
            String originalFilename = imageFile.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String imagePath = Paths.get(uploadsDir.getAbsolutePath(),
                    "temp_" + imageId + "_" + System.currentTimeMillis() + fileExtension).toString();

            tempFile = new File(imagePath);
            imageFile.transferTo(tempFile);
            log.info("Imagem temporária salva em: {}", imagePath);

            // Gerar marcadores iniciais
            GradCamMarkerService.GradCamResult result =
                    gradCamMarkerService.generateInitialMarkers(imagePath, imageId);

            response.put("status", "success");
            response.put("markersUrl", result.getMarkersUrl());
            response.put("stats", result.getStats());
            log.info("Marcadores gerados com sucesso para imageId: {}", imageId);

            return ResponseEntity.ok(response);

        } catch (IOException | InterruptedException e) {
            log.error("Erro ao gerar marcadores iniciais", e);
            response.put("status", "error");
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        } catch (IllegalArgumentException e) {
            log.error("Erro de validação ao gerar marcadores iniciais", e);
            response.put("status", "error");
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("Erro inesperado ao gerar marcadores iniciais", e);
            response.put("status", "error");
            response.put("message", "Erro interno do servidor: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        } finally {
            // Limpar arquivo temporário
            if (tempFile != null && tempFile.exists()) {
                boolean deleted = tempFile.delete();
                if (deleted) {
                    log.info("Arquivo temporário removido: {}", tempFile.getAbsolutePath());
                } else {
                    log.warn("Não foi possível remover arquivo temporário: {}", tempFile.getAbsolutePath());
                }
            }
        }
    }

    @GetMapping("/initial-markers/{filename}")
    public ResponseEntity<Resource> getInitialMarkers(@PathVariable String filename) {
        try {
            Path filePath = Paths.get("initial_markers").resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_PNG)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}