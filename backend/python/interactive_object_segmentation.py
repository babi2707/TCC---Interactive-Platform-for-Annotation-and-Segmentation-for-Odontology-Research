# -*- coding: utf-8 -*-
import sys
import os
import numpy as np
import cv2
import higra as hg
from skimage.transform import resize

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
    markers_img = cv2.imread(markers_path, cv2.IMREAD_UNCHANGED)

    print(f"[INFO] Image shape: {image.shape}")
    print(f"[INFO] Markers shape: {markers_img.shape}")

    # Converte markers para 3 canais se necessário
    if markers_img.ndim == 2:
        markers_img = cv2.cvtColor(markers_img, cv2.COLOR_GRAY2BGR)
    elif markers_img.shape[2] == 4:
        markers_img = cv2.cvtColor(markers_img, cv2.COLOR_BGRA2BGR)

    # === 2️⃣ Processa marcadores ===
    # Extrai canais vermelho e verde (BGR order)
    red_channel = markers_img[:, :, 2]   # Background markers
    green_channel = markers_img[:, :, 1] # Foreground markers

    # Cria máscaras binárias - MESMA LÓGICA DO NOTEBOOK
    foreground_mask = (green_channel > 0).astype(np.uint8)  # Qualquer pixel verde > 0
    background_mask = (red_channel > 0).astype(np.uint8)    # Qualquer pixel vermelho > 0

    print(f"[INFO] Foreground pixels: {np.sum(foreground_mask)}")
    print(f"[INFO] Background pixels: {np.sum(background_mask)}")

    # === 3️⃣ Lógica de segmentação IDÊNTICA ao notebook ===
    size = image.shape[:2]

    # Pré-processamento igual ao notebook: converte para float32 0-1
    print("[INFO] Preparando imagem...")
    image_float = image.astype(np.float32) / 255.0

    # Computa gradiente - alternativa sem modelo pré-treinado mas similar em conceito
    print("[INFO] Computando gradiente...")

    # Usa abordagem mais similar ao Structured Edge Detection
    # Converte para LAB e usa o canal L para detecção de bordas
    lab = cv2.cvtColor(image_float, cv2.COLOR_BGR2LAB)
    luminance = lab[:, :, 0]

    # Calcula gradiente usando Scharr (mais preciso que Sobel)
    grad_x = cv2.Scharr(luminance, cv2.CV_32F, 1, 0)
    grad_y = cv2.Scharr(luminance, cv2.CV_32F, 0, 1)
    gradient_image = np.sqrt(grad_x**2 + grad_y**2)

    # Suaviza o gradiente para melhor hierarquia
    gradient_image = cv2.GaussianBlur(gradient_image, (3, 3), 0.5)

    # Normaliza como no notebook
    if gradient_image.max() > 0:
        gradient_image = gradient_image / gradient_image.max()

    # === CONSTRUÇÃO DA HIERARQUIA - MESMA LÓGICA ===
    print("[INFO] Construindo hierarquia...")
    graph = hg.get_4_adjacency_graph(size)
    edge_weights = hg.weight_graph(graph, gradient_image, hg.WeightFunction.mean)

    # Watershed hierarchy - MESMO MÉTODO
    tree, altitudes = hg.watershed_hierarchy_by_area(graph, edge_weights)

    # === SEGMENTAÇÃO - LÓGICA IDÊNTICA ===
    print("[INFO] Aplicando segmentação com marcadores...")

    # VERIFICAÇÃO DE MARCADORES - mesma lógica do notebook
    if np.sum(foreground_mask) > 0 or np.sum(background_mask) > 0:
        print("[INFO] Segmentacao com marcadores fornecidos")

        # CHAMADA IDÊNTICA à função do notebook
        # hg.binary_labelisation_from_markers(tree, foreground_mask, background_mask)
        result = hg.binary_labelisation_from_markers(tree, foreground_mask, background_mask)

        # Converte resultado para máscara binária
        segmentation = (result * 255).astype(np.uint8)

    else:
        # Fallback quando não há marcadores
        print("[INFO] Nenhum marcador fornecido - usando segmentacao automatica")
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, segmentation = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # === 4️⃣ Aplica máscara à imagem original ===
    b, g, r = cv2.split(image)
    alpha = segmentation
    segmented_rgba = cv2.merge([b, g, r, alpha])

    # Garante que o diretório de saída existe
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cv2.imwrite(output_path, segmented_rgba)
    print(f"[INFO] Segmentacao salva em: {output_path}")
    print(f"[INFO] Sucesso!")

except Exception as e:
    print(f"[ERRO] Erro durante a segmentacao: {str(e)}")
    import traceback
    traceback.print_exc()
    raise