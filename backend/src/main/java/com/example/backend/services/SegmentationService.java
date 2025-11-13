package com.example.backend.services;

import com.example.backend.entities.Image;
import com.example.backend.entities.Segmented_Image;
import com.example.backend.repositories.ImageRepository;
import com.example.backend.repositories.SegmentedImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.*;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SegmentationService {

    private static final String PYTHON_PATH = "C:\\Users\\Barbara\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
    private static final String SCRIPT_PATH = new File("python/interactive_object_segmentation.py").getAbsolutePath();
    private static final String SEGMENTED_DIR = "segmented/";
    private final SegmentedImageRepository segmentedImageRepository;
    private final ImageRepository imageRepository;

    public String runAutomaticSegmentation(String imagePath, String markersPath, Long imageId) throws IOException, InterruptedException {

        if (imagePath == null || imagePath.isBlank()) {
            throw new IllegalArgumentException("Caminho da imagem não pode ser vazio.");
        }

        if (markersPath == null || markersPath.isBlank()) {
            throw new IllegalArgumentException("Caminho da máscara não pode ser vazio.");
        }

        Optional<Segmented_Image> existingSegmentedImage = segmentedImageRepository.findByImageId(imageId);

        String outputFilename;
        if(existingSegmentedImage.isPresent()){
            String existingFilePath = existingSegmentedImage.get().getFile_path();
            outputFilename = new File(existingFilePath).getName();
            System.out.println("✅ Reutilizando imagem segmentada existente: " + outputFilename);
        } else {
            outputFilename = "segmented_" + UUID.randomUUID() + ".png";

        }

        String outputPath = SEGMENTED_DIR + outputFilename;

        new File(SEGMENTED_DIR).mkdirs();

        ProcessBuilder pb = new ProcessBuilder(
                PYTHON_PATH,
                SCRIPT_PATH,
                imagePath,
                markersPath,
                outputPath
        );

        pb.environment().put("PYTHONIOENCODING", "utf-8");

        pb.redirectErrorStream(true);
        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[PYTHON] " + line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Falha na execução do script Python. Código: " + exitCode);
        }

        File outputFile = new File(outputPath);
        if (!outputFile.exists()) {
            throw new RuntimeException("Arquivo segmentado não foi gerado: " + outputPath);
        }

        Image originalImage = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Imagem original não encontrada com ID: " + imageId));

        Segmented_Image segmentedImage;

        if(existingSegmentedImage.isPresent()){
            segmentedImage = existingSegmentedImage.get();
            segmentedImage.setFile_path("segmented/" + outputFilename);
            segmentedImage.setUpdatedAt(LocalDateTime.now());
            System.out.println("✅ Atualizando imagem segmentada existente (ID: " + segmentedImage.getId() + ")");
        } else {
            segmentedImage = new Segmented_Image();
            segmentedImage.setImage(originalImage);
            segmentedImage.setFile_path("segmented/" + outputFilename);
            segmentedImage.setCreatedAt(LocalDateTime.now());
            segmentedImage.setUpdatedAt(LocalDateTime.now());
            System.out.println("✅ Criando nova imagem segmentada");
        }

        segmentedImageRepository.save(segmentedImage);
        return "/segmented/" + outputFilename;
    }
}