package com.example.backend.repositories;

import com.example.backend.entities.Database;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DatabaseRepository extends JpaRepository<Database,Integer> {
    Optional<Database> findByName(String name);
}
