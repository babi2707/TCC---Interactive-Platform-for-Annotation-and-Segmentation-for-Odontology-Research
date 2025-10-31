import sys
import cv2
import urllib.parse  # Para decodificar paths
import os

def automatic_segmentation(input_path, output_path):
    # Decodifica URI para lidar com caracteres especiais
    input_path = urllib.parse.unquote(input_path)

    # Verifica se a imagem existe
    if not os.path.isfile(input_path):
        raise ValueError(f"Não foi possível carregar a imagem: {input_path}")

    # Lê a imagem
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError(f"Não foi possível ler a imagem: {input_path}")

    # --- Aqui vai seu algoritmo de segmentação ---
    # Por enquanto, apenas salva a mesma imagem como teste
    cv2.imwrite(output_path, image)
    print(f"Imagem segmentada salva em: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python segment_image.py <caminho_imagem_entrada> <caminho_imagem_saida>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    automatic_segmentation(input_path, output_path)
