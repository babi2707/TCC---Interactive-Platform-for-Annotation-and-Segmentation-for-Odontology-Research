package com.example.backend.services;

import com.example.backend.entities.Annotation;
import com.example.backend.entities.Image;
import com.example.backend.repositories.AnnotationRepository;
import com.example.backend.repositories.ImageRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
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
    private final AnnotationRepository annotationRepository;
    private final ImageRepository imageRepository;

    public GradCamResult generateInitialMarkers(String imagePath, Long imageId) throws IOException, InterruptedException {
        if (imagePath == null || imagePath.isBlank()) {
            throw new IllegalArgumentException("Caminho da imagem não pode ser vazio.");
        }

        // Verificar se o arquivo de imagem existe
        File imageFile = new File(imagePath);
        if (!imageFile.exists()) {
            throw new IllegalArgumentException("Arquivo de imagem não encontrado: " + imagePath);
        }

        Optional<Annotation> existingAnnotation = annotationRepository.findByImageId(imageId);

        // Criar diretório para marcadores iniciais
        new File(MARKERS_DIR).mkdirs();

        // Gerar nome único para o arquivo de marcadores
        String outputFilename;
        String fullOutputPath;

        if (existingAnnotation.isPresent()) {
            // Se já existe, tentamos reutilizar o nome do arquivo para não encher o disco
            // (Nota: Cuidado com cache de navegador ao reutilizar nomes)
            String existingPath = existingAnnotation.get().getFilePath();
            File oldFile = new File(existingPath.startsWith("/") ? existingPath.substring(1) : existingPath);
            outputFilename = oldFile.getName();
        } else {
            outputFilename = "markers_" + imageId + "_" + UUID.randomUUID() + ".png";
        }

        // Caminho completo do sistema para passar ao Python
        fullOutputPath = Paths.get(MARKERS_DIR, outputFilename).toString();

        log.info("Gerando marcadores iniciais para imagem: {}", imagePath);
        log.info("Arquivo de saída: {}", fullOutputPath);

        ProcessBuilder pb = new ProcessBuilder(
                PYTHON_PATH,
                SCRIPT_PATH,
                imagePath,
                fullOutputPath
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
        File outputFile = new File(fullOutputPath);
        if (!outputFile.exists()) {
            log.error("Arquivo de marcadores não foi gerado: {}", fullOutputPath);
            throw new RuntimeException("Arquivo de marcadores não foi gerado: " + fullOutputPath);
        }

        Image originalImage = imageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Imagem original não encontrada com ID: " + imageId));

        Annotation annotation;

        if(existingAnnotation.isPresent()){
            annotation = existingAnnotation.get();
            annotation.setFilePath("/" + MARKERS_DIR + outputFilename);
            annotation.setUpdatedAt(LocalDateTime.now());
        } else {
            annotation = new Annotation();
            annotation.setImage(originalImage);
            annotation.setFilePath("/" + MARKERS_DIR + outputFilename);
            annotation.setCreatedAt(LocalDateTime.now());
            annotation.setUpdatedAt(LocalDateTime.now());
        }

        log.info("Arquivo de marcadores gerado com sucesso: {} ({} bytes)",
                fullOutputPath, outputFile.length());

        // Se não encontrou JSON na linha, procurar no output completo
        if (jsonResponse == null) {
            jsonResponse = extractJsonFromOutput(output.toString());
        }

        // Parse da resposta JSON
        if (jsonResponse != null && isValidJsonResponse(jsonResponse)) {
            try {
                JsonNode rootNode = objectMapper.readTree(jsonResponse);

                if (rootNode.has("data")) {
                    JsonNode dataNode = rootNode.get("data");

                    // CONVERSÃO MÁGICA: JsonNode -> Map<String, Object>
                    Map<String, Object> annotationMap = objectMapper.convertValue(
                            dataNode,
                            new TypeReference<Map<String, Object>>() {}
                    );

                    annotation.setAnnotationData(annotationMap);
                }
                annotationRepository.save(annotation);
                return new GradCamResult("/initial_markers/" + outputFilename, jsonResponse);
            } catch (Exception e) {
                log.error("Erro ao converter JSON para Map: ", e);
                throw new RuntimeException("Erro ao processar dados da anotação", e);
            }
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