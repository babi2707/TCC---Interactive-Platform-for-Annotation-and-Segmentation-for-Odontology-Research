import sys
import numpy as np
import cv2
import higra as hg


def automatic_segmentation(input_path, output_path):
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError(f"Não foi possível carregar a imagem: {input_path}")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gradient = hg.weight_graph_from_image(gray)
    tree, altitudes = hg.component_tree_min_tree(gradient)
    labels = hg.labelisation_hierarchy_superpixels(
        tree, altitudes, num_superpixels=200)

    # Colore as regiões para visualização
    segmented_image = np.zeros_like(image)
    for label in np.unique(labels):
        mask = labels == label
        color = np.random.randint(0, 255, size=3)
        segmented_image[mask] = color

    cv2.imwrite(output_path, segmented_image)
    print("Segmentation saved:", output_path)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python segment_image.py <input_path> <output_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    automatic_segmentation(input_path, output_path)
