package com.example.backend.controllers;

import com.example.backend.entities.Database;
import com.example.backend.usecases.registerdatabase.RegisterDatabase;
import com.example.backend.usecases.registerdatabase.RegisterDatabaseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/database")
@RequiredArgsConstructor
public class DatabaseController {
    private final RegisterDatabase registerDatabase;

    @PostMapping("/register")
    public ResponseEntity<Database> registerDatabase(@RequestBody RegisterDatabaseDTO databaseDTO) {
        Database database = registerDatabase.execute(databaseDTO.getName(), databaseDTO.getUserId(), databaseDTO.getImageIds());
        return ResponseEntity.ok(database);
    }
}
