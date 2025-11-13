package com.example.backend.controllers;

import com.example.backend.entities.Image;
import com.example.backend.services.SegmentationService;
import com.example.backend.usecases.findallimagesbydatabase.FindAllImagesByDatabase;
import com.example.backend.usecases.findimagebyid.FindImageById;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/image")
@RequiredArgsConstructor
public class ImageController {

    private final FindAllImagesByDatabase findAllImagesByDatabase;
    private final FindImageById findImageById;

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
}