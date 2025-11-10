# -*- coding: utf-8 -*-
import sys
import os
import numpy as np
import cv2
from skimage.segmentation import watershed
from scipy import ndimage as ndi

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

# === 1️⃣ Carrega imagens ===
image = cv2.imread(input_path, cv2.IMREAD_COLOR)
markers = cv2.imread(markers_path, cv2.IMREAD_UNCHANGED)

print(f"[INFO] Image shape: {image.shape}")
print(f"[INFO] Markers shape: {markers.shape}")

# Se o markers vier só com 1 canal → duplica para RGB
if markers.ndim == 2:
    print("[INFO] Markers sem canais de cor, convertendo GRAY -> BGR")
    markers = cv2.cvtColor(markers, cv2.COLOR_GRAY2BGR)

# Se vier RGBA → converte para RGB
if markers.shape[2] == 4:
    print("[INFO] Markers com alpha encontrado (BGRA), convertendo -> BGR")
    markers = cv2.cvtColor(markers, cv2.COLOR_BGRA2BGR)

# Logging dos valores únicos
unique_vals = np.unique(markers.reshape(-1, 3), axis=0)
print(f"[INFO] Valores unicos nos markers: {unique_vals[:10]}")

# === 2️⃣ Converte a imagem para cinza e suaviza ===
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
elevation_map = ndi.gaussian_filter(gray, sigma=2)

# === 3️⃣ Extrai foreground (verde) e background (vermelho) ===
red = markers[:, :, 2].astype(np.int16)
green = markers[:, :, 1].astype(np.int16)

foreground = green > 150
background = red > 150

print(f"[INFO] Foreground pixels: {np.sum(foreground)}")
print(f"[INFO] Background pixels: {np.sum(background)}")

# Verificação mínima para evitar resultado preto
if np.sum(foreground) == 0:
    raise ValueError("Nenhuma marca de foreground encontrada! O usuario marcou o objeto em verde?")
if np.sum(background) == 0:
    raise ValueError("Nenhuma marca de background encontrada! O usuario marcou o fundo em vermelho?")

# === 4️⃣ Construção dos marcadores para o Watershed ===
markers_ws = np.zeros_like(gray, dtype=np.int32)
markers_ws[background] = 1
markers_ws[foreground] = 2

# === 5️⃣ Segmentação Watershed ===
labels = watershed(elevation_map, markers_ws)

# === 6️⃣ Gera máscara final ===
mask = (labels == 2).astype(np.uint8) * 255

# === 7️⃣ Aplica máscara à imagem original ===
b, g, r = cv2.split(image)
alpha = mask
segmented_rgba = cv2.merge([b, g, r, alpha])

cv2.imwrite(output_path, segmented_rgba)
print(f"[INFO] Segmentacao salva em: {output_path}")