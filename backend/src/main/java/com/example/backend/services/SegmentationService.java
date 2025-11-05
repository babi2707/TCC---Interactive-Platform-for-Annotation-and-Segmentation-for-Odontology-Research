package com.example.backend.services;

import org.springframework.stereotype.Service;

import java.io.*;
import java.util.UUID;

@Service
public class SegmentationService {

    private static final String PYTHON_PATH = "C:\\Users\\Barbara\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
    private static final String SCRIPT_PATH = new File("python/interactive_object_segmentation.py").getAbsolutePath();

    // CORREÇÃO: Mude para uma pasta mais simples
    private static final String SEGMENTED_DIR = "segmented/";

    public String runAutomaticSegmentation(String imagePath, String markersPath, String outputFilename) throws IOException, InterruptedException {

        if (imagePath == null || imagePath.isBlank()) {
            throw new IllegalArgumentException("Caminho da imagem não pode ser vazio.");
        }

        if (markersPath == null || markersPath.isBlank()) {
            throw new IllegalArgumentException("Caminho da máscara não pode ser vazio.");
        }

        // Usa o filename fornecido ou gera um novo
        String finalOutputFilename = outputFilename != null && !outputFilename.isBlank()
                ? outputFilename
                : "segmented_" + UUID.randomUUID() + ".png";

        String outputPath = SEGMENTED_DIR + finalOutputFilename;

        // Cria diretório se não existir
        new File(SEGMENTED_DIR).mkdirs();

        // Comando para executar o script Python
        ProcessBuilder pb = new ProcessBuilder(
                PYTHON_PATH,
                SCRIPT_PATH,
                imagePath,
                markersPath,
                outputPath
        );

        // Configurar environment para UTF-8
        pb.environment().put("PYTHONIOENCODING", "utf-8");

        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Log do Python no console
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

        // Verifica se o arquivo foi criado
        File outputFile = new File(outputPath);
        if (!outputFile.exists()) {
            throw new RuntimeException("Arquivo segmentado não foi gerado: " + outputPath);
        }

        // Retorna apenas o nome do arquivo
        return finalOutputFilename;
    }
}