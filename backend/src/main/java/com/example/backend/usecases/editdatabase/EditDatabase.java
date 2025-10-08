package com.example.backend.usecases.editdatabase;

import com.example.backend.entities.Database;
import com.example.backend.interfaces.IDatabaseService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class EditDatabase {
    private IDatabaseService databaseService;

    public Database execute(EditDatabaseDTO editDatabaseDTO) {
        return databaseService.editDatabase(editDatabaseDTO.getId(), editDatabaseDTO.getName(), editDatabaseDTO.getNewFiles(),  editDatabaseDTO.getRemovedFileIds());
    }
}
