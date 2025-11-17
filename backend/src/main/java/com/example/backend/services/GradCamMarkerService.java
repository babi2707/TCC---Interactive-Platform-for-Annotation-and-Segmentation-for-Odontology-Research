package com.example.backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradCamMarkerService {

    private static final String PYTHON_PATH = "C:\\Users\\Barbara\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
    private static final String SCRIPT_PATH = new File("python/gradcam_markers.py").getAbsolutePath();
    private static final String MARKERS_DIR = "initial_markers/";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GradCamResult generateInitialMarkers(String imagePath, Long imageId) throws IOException, InterruptedException {
        if (imagePath == null || imagePath.isBlank()) {
            throw new IllegalArgumentException("Caminho da imagem não pode ser vazio.");
        }

        // Verificar se o arquivo de imagem existe
        File imageFile = new File(imagePath);
        if (!imageFile.exists()) {
            throw new IllegalArgumentException("Arquivo de imagem não encontrado: " + imagePath);
        }

        // Criar diretório para marcadores iniciais
        new File(MARKERS_DIR).mkdirs();

        // Gerar nome único para o arquivo de marcadores
        String outputFilename = "markers_" + imageId + "_" + UUID.randomUUID() + ".png";
        String outputPath = Paths.get(MARKERS_DIR, outputFilename).toString();

        log.info("Gerando marcadores iniciais para imagem: {}", imagePath);
        log.info("Arquivo de saída: {}", outputPath);

        ProcessBuilder pb = new ProcessBuilder(
                PYTHON_PATH,
                SCRIPT_PATH,
                imagePath,
                outputPath
        );

        pb.environment().put("PYTHONIOENCODING", "utf-8");
        pb.redirectErrorStream(true);

        Process process = pb.start();

        // Ler saída do script Python
        StringBuilder output = new StringBuilder();
        String jsonResponse = null;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                log.info("[GRADCAM] {}", line);

                // Tentar extrair JSON da linha
                if (isValidJsonLine(line)) {
                    jsonResponse = line.trim();
                    log.info("JSON encontrado e válido: {}", jsonResponse);
                    break; // Parar na primeira linha JSON válida
                }
            }
        }

        int exitCode = process.waitFor();
        log.info("Script Python finalizado com código: {}", exitCode);

        if (exitCode != 0) {
            throw new RuntimeException("Falha na execução do script Grad-CAM. Código: " + exitCode);
        }

        // Verificar se o arquivo foi gerado
        File outputFile = new File(outputPath);
        if (!outputFile.exists()) {
            log.error("Arquivo de marcadores não foi gerado: {}", outputPath);
            throw new RuntimeException("Arquivo de marcadores não foi gerado: " + outputPath);
        }

        log.info("Arquivo de marcadores gerado com sucesso: {} ({} bytes)",
                outputPath, outputFile.length());

        // Se não encontrou JSON na linha, procurar no output completo
        if (jsonResponse == null) {
            jsonResponse = extractJsonFromOutput(output.toString());
        }

        // Parse da resposta JSON
        if (jsonResponse != null && isValidJsonResponse(jsonResponse)) {
            return new GradCamResult("/initial_markers/" + outputFilename, jsonResponse);
        } else {
            log.error("Script Grad-CAM não retornou JSON válido. Output completo: {}", output.toString());
            // Mesmo sem JSON válido, se o arquivo foi gerado, retornar sucesso
            if (outputFile.exists() && outputFile.length() > 0) {
                log.warn("Retornando sucesso apesar de JSON inválido, pois arquivo foi gerado");
                String fallbackStats = "{\"object_markers\": 0, \"background_markers\": 0, \"total_markers\": 0, \"image_size\": [0, 0], \"method\": \"fallback\"}";
                return new GradCamResult("/initial_markers/" + outputFilename, fallbackStats);
            } else {
                throw new RuntimeException("Script Grad-CAM não retornou resposta válida e nenhum arquivo foi gerado.");
            }
        }
    }

    /**
     * Verifica se a linha é um JSON válido
     */
    private boolean isValidJsonLine(String line) {
        if (line == null || line.trim().isEmpty()) {
            return false;
        }

        String trimmed = line.trim();
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
            return false;
        }

        try {
            objectMapper.readTree(trimmed);
            return true;
        } catch (JsonProcessingException e) {
            return false;
        }
    }

    /**
     * Verifica se a resposta JSON é válida e contém status success
     */
    private boolean isValidJsonResponse(String jsonResponse) {
        try {
            JsonNode jsonNode = objectMapper.readTree(jsonResponse);
            return jsonNode.has("status") && "success".equals(jsonNode.get("status").asText());
        } catch (Exception e) {
            log.warn("JSON inválido: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Extrai JSON do output completo usando regex
     */
    private String extractJsonFromOutput(String output) {
        try {
            // Padrão para encontrar JSON
            Pattern pattern = Pattern.compile("\\{.*?\\}");
            Matcher matcher = pattern.matcher(output);

            while (matcher.find()) {
                String candidate = matcher.group();
                if (isValidJsonResponse(candidate)) {
                    log.info("JSON extraído via regex: {}", candidate);
                    return candidate;
                }
            }
        } catch (Exception e) {
            log.warn("Erro ao extrair JSON via regex: {}", e.getMessage());
        }

        return null;
    }

    public static class GradCamResult {
        private final String markersUrl;
        private final String stats;

        public GradCamResult(String markersUrl, String stats) {
            this.markersUrl = markersUrl;
            this.stats = stats;
        }

        public String getMarkersUrl() {
            return markersUrl;
        }

        public String getStats() {
            return stats;
        }
    }
}