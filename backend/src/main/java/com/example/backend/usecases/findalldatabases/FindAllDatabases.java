package com.example.backend.usecases.findalldatabases;

import com.example.backend.entities.Database;
import com.example.backend.interfaces.IDatabaseService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@AllArgsConstructor
public class FindAllDatabases {
    private final IDatabaseService databaseService;

    public List<FindAllDatabasesDTO> execute() {
        List<Database> allDatabases = databaseService.findAllDatabases();

        return allDatabases.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private FindAllDatabasesDTO convertToDTO(Database database) {
        FindAllDatabasesDTO dto = new FindAllDatabasesDTO();
        dto.setId(database.getId());
        dto.setName(database.getName());

        boolean hasEditedImages = database.getImages().stream()
                .anyMatch(image -> Boolean.TRUE.equals(image.getEdited()));
        dto.setEdited(hasEditedImages);

        return dto;
    }
}
