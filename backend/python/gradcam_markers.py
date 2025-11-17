import cv2
import numpy as np
from PIL import Image
import json
import sys
import warnings

warnings.filterwarnings('ignore')

def preprocess_image(image_path):
    image = Image.open(image_path).convert('RGB')
    original_size = image.size
    return np.array(image), original_size

def generate_markers_from_image_processing(image_np, original_size):
    w, h = original_size
    markers_img = np.zeros((h, w, 3), dtype=np.uint8)

    # Lista para guardar os dados estruturados (JSON)
    markers_data = []

    COLOR_GREEN = (0, 255, 0)    # Objeto
    COLOR_RED = (0, 0, 255)      # Fundo

    obj_count = 0
    bg_count = 0

    try:
        # --- Lógica de Processamento (Mantida igual à anterior para brevidade) ---
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        blur = cv2.bilateralFilter(gray, 9, 75, 75)
        ret, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        kernel = np.ones((3,3), np.uint8)
        opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

        border_mean = (np.mean(opening[0,:]) + np.mean(opening[-1,:]) + \
                       np.mean(opening[:,0]) + np.mean(opening[:,-1])) / 4
        if border_mean > 127:
            opening = cv2.bitwise_not(opening)

        # --- 1. MARCADORES DE OBJETO (VERDE) ---
        dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
        ret, sure_fg = cv2.threshold(dist_transform, 0.5 * dist_transform.max(), 255, 0)
        sure_fg = np.uint8(sure_fg)
        contours, _ = cv2.findContours(sure_fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            if cv2.contourArea(cnt) > 10:
                M = cv2.moments(cnt)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])

                    # Desenha (Visual)
                    cv2.circle(markers_img, (cx, cy), 10, COLOR_GREEN, -1)

                    # Salva Dado (JSON)
                    markers_data.append({
                        "x": cx,
                        "y": cy,
                        "label": "foreground", # ou "object"
                        "type": "point"
                    })
                    obj_count += 1

        # Fallback objeto (simplificado)
        if obj_count == 0:
            # ... (lógica de fallback igual) ...
            # Ao adicionar pontos no fallback, lembre de adicionar ao markers_data também!
            pass

        # --- 2. MARCADORES DE FUNDO (VERMELHO) ---
        sure_bg_area = cv2.dilate(opening, kernel, iterations=10)
        sure_bg_mask = cv2.bitwise_not(sure_bg_area)

        step_x = w // 8
        step_y = h // 8

        for y in range(step_y // 2, h, step_y):
            for x in range(step_x // 2, w, step_x):
                if bg_count >= 12: break

                if sure_bg_mask[y, x] == 255:
                    cv2.circle(markers_img, (x, y), 10, COLOR_RED, -1)
                    # Salva Dado (JSON)
                    markers_data.append({
                        "x": x,
                        "y": y,
                        "label": "background",
                        "type": "point"
                    })
                    bg_count += 1

        # Fallback fundo (simplificado)
        if bg_count < 4:
            corners = [(20, 20), (w-20, 20), (20, h-20), (w-20, h-20)]
            for x, y in corners:
                if np.all(markers_img[y, x] == 0):
                    cv2.circle(markers_img, (x, y), 10, COLOR_RED, -1)
                    markers_data.append({
                        "x": x, "y": y, "label": "background", "type": "point"
                    })
                    bg_count += 1

    except Exception as e:
        pass # Tratar erro

    # Retorna a imagem E os dados brutos
    return markers_img, markers_data, obj_count, bg_count

def generate_initial_markers(image_path, output_path):
    try:
        image_np, original_size = preprocess_image(image_path)
        markers_img, markers_data, obj_count, bg_count = generate_markers_from_image_processing(image_np, original_size)

        # Ainda salvamos a imagem visual para debug/cache se necessário,
        # mas o importante agora é o JSON
        cv2.imwrite(output_path, markers_img)

        result_data = {
            "image_size": original_size,
            "counts": {"object": obj_count, "background": bg_count},
            "points": markers_data  # <--- LISTA IMPORTANTE AQUI
        }

        return True, result_data

    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    # ... (boilerplate main igual, chamando generate_initial_markers) ...
    image_path = sys.argv[1]
    output_path = sys.argv[2]
    success, result = generate_initial_markers(image_path, output_path)

    if success:
        # O JSON impresso agora contém a lista "points"
        print(json.dumps({"status": "success", "data": result}))
    else:
        print(json.dumps({"status": "error", "message": result}))