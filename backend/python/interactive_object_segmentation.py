# -*- coding: utf-8 -*-
import sys
import os
import numpy as np
import cv2

# Configurar encoding para evitar problemas com caracteres Unicode
sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

if len(sys.argv) < 4:
    print("Uso: python interactive_object_segmentation.py <input_path> <markers_path> <output_path>")
    sys.exit(1)

input_path = sys.argv[1]
markers_path = sys.argv[2]
output_path = sys.argv[3]

if not os.path.exists(input_path):
    raise FileNotFoundError(f"Imagem nao encontrada: {input_path}")
if not os.path.exists(markers_path):
    raise FileNotFoundError(f"Markers nao encontrados: {markers_path}")

try:
    # === 1️⃣ Carrega imagens ===
    image = cv2.imread(input_path, cv2.IMREAD_COLOR)
    markers = cv2.imread(markers_path, cv2.IMREAD_UNCHANGED)

    print(f"[INFO] Image shape: {image.shape}")
    print(f"[INFO] Markers shape: {markers.shape}")

    # Converte markers para 3 canais se necessário
    if markers.ndim == 2:
        markers = cv2.cvtColor(markers, cv2.COLOR_GRAY2BGR)
    elif markers.shape[2] == 4:
        markers = cv2.cvtColor(markers, cv2.COLOR_BGRA2BGR)

    # === 2️⃣ Converte para escala de cinza ===
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # === 3️⃣ Processa marcadores ===
    # Extrai canais vermelho e verde
    red_channel = markers[:, :, 2]
    green_channel = markers[:, :, 1]

    # Cria máscaras
    foreground_mask = green_channel > 50
    background_mask = red_channel > 50

    print(f"[INFO] Foreground pixels: {np.sum(foreground_mask)}")
    print(f"[INFO] Background pixels: {np.sum(background_mask)}")

    # === 4️⃣ Lógica de segmentação ===
    if np.sum(foreground_mask) > 0 and np.sum(background_mask) > 0:
        print("[INFO] Segmentacao com marcadores completos")
        # Se temos ambos, cria uma máscara baseada na região marcada
        segmentation = np.zeros_like(gray)

        # Encontra o bounding box dos marcadores de foreground
        coords = np.argwhere(foreground_mask)
        if len(coords) > 0:
            y_min, x_min = coords.min(axis=0)
            y_max, x_max = coords.max(axis=0)

            # Segmenta a região ao redor dos marcadores
            roi = gray[y_min:y_max, x_min:x_max]
            if roi.size > 0:
                _, local_mask = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                segmentation[y_min:y_max, x_min:x_max] = local_mask
    else:
        print("[INFO] Segmentacao automatica")
        # Segmentação automática
        _, segmentation = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # === 5️⃣ Aplica máscara à imagem original ===
    b, g, r = cv2.split(image)
    alpha = segmentation
    segmented_rgba = cv2.merge([b, g, r, alpha])

    cv2.imwrite(output_path, segmented_rgba)
    print(f"[INFO] Segmentacao salva em: {output_path}")
    print(f"[INFO] Sucesso!")

except Exception as e:
    print(f"[ERRO] Erro durante a segmentacao: {str(e)}")
    raise