package com.example.backend.services;

import org.springframework.stereotype.Service;

import java.io.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class SegmentationService {
    private static final String PYTHON_PATH = "C:\\Users\\Barbara\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
    private static final String SCRIPT_PATH = new File("python/segment_image.py").getAbsolutePath();
    private static final String UPLOADS_DIR = "uploads/";
    private static final String SEGMENTED_DIR = "src/main/resources/static/segmented/";

    public String runAutomaticSegmentation(String filename) throws IOException, InterruptedException {
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Nome do arquivo não pode ser vazio.");
        }

        File inputFile = Paths.get(UPLOADS_DIR, filename).toFile();
        if (!inputFile.exists()) {
            throw new FileNotFoundException("Imagem não encontrada: " + inputFile.getAbsolutePath());
        }

        String inputImagePath = inputFile.getAbsolutePath();
        String outputFilename = "segmented_" + UUID.randomUUID() + ".png";
        String outputPath = SEGMENTED_DIR + outputFilename;

        new File(SEGMENTED_DIR).mkdirs();


        ProcessBuilder pb = new ProcessBuilder(
                PYTHON_PATH,
                SCRIPT_PATH,
                inputImagePath,
                outputPath
        );

        pb.redirectErrorStream(true);
        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[PYTHON] " + line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Falha na execução do script Python. Código: " + exitCode);
        }

        return "/segmented/" + outputFilename;
    }
}
