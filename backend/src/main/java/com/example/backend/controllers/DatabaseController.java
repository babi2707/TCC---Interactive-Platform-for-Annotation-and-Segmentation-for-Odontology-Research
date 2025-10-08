package com.example.backend.controllers;

import com.example.backend.entities.Database;
import com.example.backend.usecases.deletedatabase.DeleteDatabase;
import com.example.backend.usecases.editdatabase.EditDatabase;
import com.example.backend.usecases.editdatabase.EditDatabaseDTO;
import com.example.backend.usecases.findalldatabases.FindAllDatabases;
import com.example.backend.usecases.findalldatabases.FindAllDatabasesDTO;
import com.example.backend.usecases.registerdatabase.RegisterDatabase;
import com.example.backend.usecases.registerdatabase.RegisterDatabaseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/database")
@RequiredArgsConstructor
public class DatabaseController {
    private final RegisterDatabase registerDatabase;
    private final FindAllDatabases findAllDatabases;
    private final DeleteDatabase deleteDatabase;
    private final EditDatabase editDatabase;

    @PostMapping(value = "/register", consumes = "multipart/form-data")
    public ResponseEntity<Database> registerDatabase(@ModelAttribute RegisterDatabaseDTO databaseDTO) {
        Database database = registerDatabase.execute(databaseDTO.getName(), databaseDTO.getUserId(), databaseDTO.getFiles());
        return ResponseEntity.ok(database);
    }

    @GetMapping(value = "/findAll")
    public ResponseEntity<List<FindAllDatabasesDTO>> getAllDatabases() {
        List<FindAllDatabasesDTO> databases = findAllDatabases.execute();
        return ResponseEntity.ok(databases);
    }

    @PutMapping(value = "/edit", consumes = "multipart/form-data")
    public ResponseEntity<Database> editDatabase(@ModelAttribute EditDatabaseDTO editDatabaseDTO) {
        Database database = editDatabase.execute(editDatabaseDTO);
        return ResponseEntity.ok(database);
    }

    @DeleteMapping(value = "/delete/{id}")
    public ResponseEntity<Void> deleteDatabase(@PathVariable Long id){
        deleteDatabase.execute(id);
        return ResponseEntity.noContent().build();
    }
}
