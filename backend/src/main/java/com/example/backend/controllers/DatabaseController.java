package com.example.backend.controllers;

import com.example.backend.entities.Database;
import com.example.backend.usecases.registerdatabase.RegisterDatabase;
import com.example.backend.usecases.registerdatabase.RegisterDatabaseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/database")
@RequiredArgsConstructor
public class DatabaseController {
    private final RegisterDatabase registerDatabase;

    @PostMapping(value = "/register", consumes = "multipart/form-data")
    public ResponseEntity<Database> registerDatabase(@ModelAttribute RegisterDatabaseDTO databaseDTO) {
        Database database = registerDatabase.execute(databaseDTO.getName(), databaseDTO.getUserId(), databaseDTO.getFiles());
        return ResponseEntity.ok(database);
    }
}
