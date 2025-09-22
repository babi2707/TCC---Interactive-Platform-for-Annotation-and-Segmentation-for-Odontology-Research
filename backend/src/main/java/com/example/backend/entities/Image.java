package com.example.backend.entities;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
@Table(name = "images")
public class Image {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "database_id")
    private Database database;

    @Column(name = "file_path")
    private String file_path;

    @Column(name = "edited")
    private Boolean edited = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Image(Database database, String file_path, Boolean edited) {
        this.database = database;
        this.file_path = file_path;
        this.edited = edited;
    }

    public Image() {

    }
}
