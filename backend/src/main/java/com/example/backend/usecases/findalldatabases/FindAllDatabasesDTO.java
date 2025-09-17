package com.example.backend.usecases.findalldatabases;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FindAllDatabasesDTO {
    private Long id;
    private String name;
    private Boolean edited;
}
