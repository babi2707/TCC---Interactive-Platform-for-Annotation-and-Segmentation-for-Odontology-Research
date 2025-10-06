package com.example.backend.usecases.deletedatabase;

import com.example.backend.interfaces.IDatabaseService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class DeleteDatabase {
    private IDatabaseService databaseService;

    public void execute(Long databaseId){
        databaseService.deleteDatabase(databaseId);
    }
}
