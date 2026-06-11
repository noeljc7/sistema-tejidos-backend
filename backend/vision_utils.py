import cv2
import numpy as np
import os

# Rutas de los modelos
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
YUNET_PATH = os.path.join(MODELS_DIR, "yunet.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "sface.onnx")

# Inicializar modelos de OpenCV
try:
    # Bajamos el umbral de 0.9 a 0.6 para ser más permisivos con la detección inicial
    detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 320), 0.6, 0.3, 5000)
    recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
    print("✅ Modelos YuNet y SFace cargados con sensibilidad optimizada.")
except Exception as e:
    print(f"⚠️ Error cargando modelos ONNX: {e}")
    detector = None

def get_face_encoding(image_path):
    if detector is None: return None
    
    try:
        img = cv2.imread(image_path)
        if img is None: return None
        
        # Mejora de iluminación automática (CLAHE)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        height, width, _ = img.shape
        detector.setInputSize((width, height))
        
        _, faces = detector.detect(img)
        
        if faces is not None:
            # Seleccionar el rostro más grande (el que está más cerca)
            best_face = faces[0]
            if len(faces) > 1:
                areas = [f[2] * f[3] for f in faces]
                best_face = faces[np.argmax(areas)]

            face_aligned = recognizer.alignCrop(img, best_face)
            feature = recognizer.feature(face_aligned)
            return feature.flatten().tolist()
    except Exception as e:
        print(f"Error en procesamiento facial: {e}")
    return None

def compare_faces(unknown_encoding, known_encodings_dict):
    """
    Compara vectores de características y devuelve el ID y el puntaje de confianza.
    """
    if unknown_encoding is None or not known_encodings_dict or recognizer is None:
        print("❌ Error: No hay datos para comparar.")
        return None, 0
    
    unknown_feat = np.array(unknown_encoding, dtype=np.float32).reshape(1, -1)
    
    best_match_id = None
    max_score = -1.0
    threshold = 0.36 

    print(f"--- Iniciando Comparación (Total de tejedoras: {len(known_encodings_dict)}) ---")

    for tejedora_id, known_encoding in known_encodings_dict.items():
        if known_encoding is None: continue
        
        known_feat = np.array(known_encoding, dtype=np.float32).reshape(1, -1)
        
        try:
            # Score de 1.0 es idéntico, 0.0 es nada que ver.
            score = recognizer.match(unknown_feat, known_feat, 0)
            print(f"   > Tejedora ID {tejedora_id}: Similitud = {score:.4f}")
            
            if score > max_score:
                max_score = score
                if score > threshold:
                    best_match_id = tejedora_id
        except Exception as e:
            print(f"   > Error comparando ID {tejedora_id}: {e}")
            
    if best_match_id:
        print(f"✅ MATCH ENCONTRADO: ID {best_match_id} con puntaje {max_score:.4f}")
    else:
        print(f"⚠️ SIN MATCH: Puntaje máximo fue {max_score:.4f} (Umbral necesario: {threshold})")
            
    return best_match_id, max_score

def detect_product_color(image_path):
    """
    Analiza la imagen del producto con K-Means para detectar colores primarios y secundarios,
    y analiza la textura para determinar si es liso, rayado o jaspeado.
    """
    try:
        img = cv2.imread(image_path)
        if img is None: return "Sin datos"
        
        # 1. Preprocesamiento: Recorte central para evitar fondos
        h, w, _ = img.shape
        roi = img[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
        
        # 2. Análisis de Colores con K-Means (Detectar 2 colores principales)
        pixels = roi.reshape(-1, 3).astype(np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        flags = cv2.KMEANS_RANDOM_CENTERS
        compactness, labels, centers = cv2.kmeans(pixels, 2, None, criteria, 10, flags)
        
        # Contar píxeles por color
        counts = np.bincount(labels.flatten())
        sorted_indices = np.argsort(counts)[::-1]
        
        def get_color_name(bgr):
            b, g, r = bgr
            if r > 220 and g > 220 and b > 220: return "Blanco"
            if r < 45 and g < 45 and b < 45: return "Negro"
            if abs(r-g) < 15 and abs(g-b) < 15: return "Gris"
            if r > 150 and g < 100 and b < 100: return "Rojo"
            if r > 150 and g > 150 and b < 100: return "Amarillo"
            if r < 100 and g > 120 and b < 100: return "Verde"
            if r < 100 and g < 120 and b > 150: return "Azul"
            if r > 150 and g < 100 and b > 150: return "Púrpura"
            if r > 160 and g > 100 and b < 80: return "Marrón/Café"
            if r > 200 and g > 130 and b > 130: return "Rosa/Pastel"
            return "Multicolor"

        primary_color = get_color_name(centers[sorted_indices[0]])
        secondary_color = get_color_name(centers[sorted_indices[1]]) if len(centers) > 1 else None
        
        # 3. Análisis de Patrón/Textura usando varianza de bordes
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Determinar estilo
        estilo = "Liso / Sólido"
        if primary_color != secondary_color and counts[sorted_indices[1]] > (len(pixels) * 0.25):
            estilo = "Bicolor / Combinado"
        if laplacian > 500:
            estilo = "Texturizado / Punto grueso"
        if laplacian > 1500:
            estilo = "Jaspeado / Patrón complejo"

        descripcion = primary_color
        if secondary_color and secondary_color != primary_color and estilo != "Liso / Sólido":
            descripcion += f" con {secondary_color}"
        
        return f"{descripcion} ({estilo})"
    except Exception as e:
        print(f"Error en IA de tela: {e}")
        return "No detectado"
