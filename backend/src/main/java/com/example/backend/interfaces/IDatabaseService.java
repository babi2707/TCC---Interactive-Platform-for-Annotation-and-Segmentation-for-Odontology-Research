package com.example.backend.interfaces;

import com.example.backend.entities.Database;

import java.util.List;

public interface IDatabaseService {
    Database createDatabase(String name, Long userId, List<Long> imageIds);
}
