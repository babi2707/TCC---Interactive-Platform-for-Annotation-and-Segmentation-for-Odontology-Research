import cv2
import numpy as np
import torch
from torchvision import models, transforms
from PIL import Image
import json
import sys
import os
import warnings

warnings.filterwarnings('ignore')

# As classes GradCAM e load_model não são mais necessárias para esta abordagem
# Mas vamos mantê-las comentadas, caso você precise delas para outro propósito.

# class GradCAM:
#     # ... (código GradCAM anterior) ...
# def load_model():
#     # ... (código load_model anterior) ...


def preprocess_image(image_path):
    # Função mantida, mas 'transform' será usado de forma diferente se houver necessidade
    image = Image.open(image_path).convert('RGB')
    original_size = image.size
    return np.array(image), original_size # Retorna imagem como numpy array diretamente

def generate_markers_from_image_processing(image_np, original_size, max_markers_per_object=1):
    """
    Gera marcadores usando técnicas de processamento de imagem (limiarização, componentes conectados).
    """
    w, h = original_size # Lembre-se: PIL retorna (Width, Height)

    # 1. Converter para tons de cinza
    gray_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)

    # 2. Suavizar a imagem para remover ruído (importante para células)
    blurred = cv2.GaussianBlur(gray_image, (15, 15), 0)

    # 3. Aplicar limiar adaptativo para binarizar a imagem
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 41, 5)

    # 4. Operações morfológicas para refinar as máscaras
    kernel = np.ones((7, 7), np.uint8)
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel, iterations=2)

    object_mask = opened

    markers = np.zeros((h, w, 3), dtype=np.uint8) # Agora markers tem (H, W, 3)

    # 5. Identificar objetos individuais usando connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(object_mask, connectivity=8)

    print(f"[IMG_PROC] Encontrados {num_labels-1} objetos na imagem")

    object_markers_count = 0
    # Iterar sobre cada objeto encontrado (ignorando o background, label 0)
    for label in range(1, num_labels):
        area = stats[label, cv2.CC_STAT_AREA]

        # Filtrar objetos muito pequenos ou muito grandes (ajuste esses valores para suas células)
        if area < 500 or area > 50000:
            print(f"[IMG_PROC] Objeto {label} ignorado devido à área ({area}).")
            continue

        center_x, center_y = int(centroids[label][0]), int(centroids[label][1])

        # Colocar o marcador verde no centroide do objeto
        cv2.circle(markers, (center_x, center_y), 15, (0, 255, 0), -1)
        object_markers_count += 1
        print(f"[IMG_PROC] Marcador no objeto {label}: posição ({center_x}, {center_y}), área: {area}")

    # 6. Adicionar marcadores de background (vermelhos)

    # *** CORREÇÃO AQUI: Usar limites ajustados ***
    # Definir uma margem mínima segura (min_margin)
    min_margin = 10

    background_points = [
        (min_margin, min_margin), (w - min_margin, min_margin), (min_margin, h - min_margin), (w - min_margin, h - min_margin),
        (w // 2, min_margin), (w // 2, h - min_margin), (min_margin, h // 2), (w - min_margin, h // 2),
        (w // 4, h // 4), (3 * w // 4, h // 4), (w // 4, 3 * h // 4), (3 * w // 4, 3 * h // 4)
    ]

    background_count = 0
    for point in background_points:
        x, y = point

        # Verificar se o ponto está dentro dos limites da máscara ANTES de acessá-lo
        if 0 <= y < h and 0 <= x < w:
            # object_mask é (H, W), então acessamos com [y, x]
            if object_mask[y, x] == 0:
                # Verificar distância dos centroides (o restante da lógica é mantido)
                too_close = False
                for label in range(1, num_labels):
                    area = stats[label, cv2.CC_STAT_AREA]
                    if area < 500 or area > 50000:
                        continue

                    c_x, c_y = centroids[label]
                    dist = np.sqrt((x - c_x)**2 + (y - c_y)**2)
                    if dist < 100:
                        too_close = True
                        break

                if not too_close and background_count < 8:
                    cv2.circle(markers, (x, y), 15, (255, 0, 0), -1)
                    background_count += 1

    print(f"[IMG_PROC] Total: {object_markers_count} marcadores de objeto, {background_count} marcadores de background")

    return markers, object_markers_count, background_count

def generate_initial_markers(image_path, output_path):
    try:
        print(f"[IMG_PROC] Processando imagem: {image_path}")

        image_np, original_size = preprocess_image(image_path)

        # Chamar a nova função de geração de marcadores
        markers, obj_count, bg_count = generate_markers_from_image_processing(image_np, original_size)
        cv2.imwrite(output_path, markers)

        stats = {
            "object_markers": int(obj_count),
            "background_markers": int(bg_count),
            "total_markers": int(obj_count + bg_count),
            "image_size": original_size,
            "method": "image_processing_adaptive_thresh" # Nome do método atualizado
        }

        print(f"[IMG_PROC] Estatísticas: {stats}")
        return True, stats

    except Exception as e:
        print(f"[IMG_PROC] Erro: {e}")
        import traceback
        print(f"[IMG_PROC] Traceback: {traceback.format_exc()}")
        return False, str(e)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python image_processing_markers.py <caminho_imagem> <caminho_saida>")
        sys.exit(1)

    image_path = sys.argv[1]
    output_path = sys.argv[2]

    success, result = generate_initial_markers(image_path, output_path)
    if success:
        print(json.dumps({"status": "success", "stats": result}), flush=True)
    else:
        print(json.dumps({"status": "error", "message": result}), flush=True)