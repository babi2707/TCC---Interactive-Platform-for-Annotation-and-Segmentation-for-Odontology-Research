package com.example.backend.controllers;

import com.example.backend.entities.Image;
import com.example.backend.usecases.findallimagesbydatabase.FindAllImagesByDatabase;
import com.example.backend.usecases.findimagebyid.FindImageById;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/image")
@RequiredArgsConstructor
public class ImageController {
    private final FindAllImagesByDatabase findAllImagesByDatabase;
    private final FindImageById  findImageById;

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
}
