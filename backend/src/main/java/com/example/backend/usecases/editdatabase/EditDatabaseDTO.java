package com.example.backend.usecases.editdatabase;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class EditDatabaseDTO {
    private Long id;
    private String name;
    private MultipartFile[] newFiles;
    private Long[] removedFileIds;
}
