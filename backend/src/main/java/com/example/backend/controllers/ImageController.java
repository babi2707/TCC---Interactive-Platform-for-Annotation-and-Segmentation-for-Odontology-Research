package com.example.backend.controllers;

import com.example.backend.entities.Image;
import com.example.backend.services.SegmentationService;
import com.example.backend.usecases.findallimagesbydatabase.FindAllImagesByDatabase;
import com.example.backend.usecases.findimagebyid.FindImageById;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/image")
@RequiredArgsConstructor
public class ImageController {
    private final FindAllImagesByDatabase findAllImagesByDatabase;
    private final FindImageById  findImageById;
    @Autowired
    private SegmentationService segmentationService;

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
    public ResponseEntity<Map<String, Object>> segmentImage(@RequestParam String filename) {
        Map<String, Object> response = new HashMap<>();

        try {
            String segmentedUrl = segmentationService.runAutomaticSegmentation(filename);

            response.put("status", "success");
            response.put("segmentedImageUrl", "http://localhost:8080" + segmentedUrl);
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
}
