import cv2
import os
import sys

# Load the reference image
dir_ref_path = '/home/oem/Documentos/Bots/Serpens/food-gpt/comparatives/asdasdasda.jpeg'
imagem_referencia = cv2.imread(dir_ref_path, cv2.IMREAD_GRAYSCALE)

# Create a SIFT object
sift = cv2.SIFT_create()

# Detect keypoints and compute descriptors for the reference image
kp_referencia, descritor_referencia = sift.detectAndCompute(imagem_referencia, None)

# Define the folder containing the comparison images
pasta_comparacao = 'calcados'

# Initialize a list of tuples to store distances and file names of the images
distancias_e_nomes = []
index_items = 0
# Iterate through all images in the comparison folder
for nome_arquivo in os.listdir(pasta_comparacao):
    index_items += 1
    print(index_items)
    
    if nome_arquivo.endswith(('.jpg', '.jpeg', '.png')):
        caminho_imagem = os.path.join(pasta_comparacao, nome_arquivo)
        img = cv2.imread(caminho_imagem, cv2.IMREAD_GRAYSCALE)
        
        # Detect keypoints and compute descriptors for the current image
        kp, descritor = sift.detectAndCompute(img, None)
        
        if descritor is not None:
            # Adjust the dimension of descriptors to a common size
            descritor_referencia = descritor_referencia[:min(len(descritor_referencia), len(descritor))]
            descritor = descritor[:min(len(descritor_referencia), len(descritor))]
            
            # Calculate the Euclidean distance between descriptors
            distancia = cv2.norm(descritor_referencia, descritor, cv2.NORM_L2)
            distancias_e_nomes.append((distancia, nome_arquivo))

# Sort the list based on distance (from smallest to largest)
distancias_e_nomes.sort(key=lambda x: x[0])

# Get the names of the three files with the smallest distances
tres_imagens_mais_semelhantes = [nome for _, nome in distancias_e_nomes[:3]]

# Get the name of the most similar image among the top three
imagem_mais_similar = tres_imagens_mais_semelhantes[0]

print(tres_imagens_mais_semelhantes)
print(imagem_mais_similar)
