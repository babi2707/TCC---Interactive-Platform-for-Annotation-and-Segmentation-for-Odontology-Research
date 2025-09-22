package com.example.backend.controllers;

import com.example.backend.entities.Image;
import com.example.backend.services.ImageService;
import com.example.backend.usecases.findalldatabases.FindAllDatabasesDTO;
import com.example.backend.usecases.findallimagesbydatabase.FindAllImagesByDatabase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/image")
@RequiredArgsConstructor
public class ImageController {
    private final FindAllImagesByDatabase findAllImagesByDatabase;

    @GetMapping(value = "/findAllByDatabase")
    public ResponseEntity<List<Image>> getAllImagesByDatabase(@RequestParam Long databaseId) {
        List<Image> images = findAllImagesByDatabase.execute(databaseId);
        return ResponseEntity.ok(images);
    }
}
