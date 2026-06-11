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
    Analiza la imagen del producto para detectar el color predominante.
    """
    try:
        img = cv2.imread(image_path)
        if img is None: return "Desconocido"
        
        # Redimensionar para velocidad
        img = cv2.resize(img, (100, 100))
        # Convertir a LAB para mejor percepción de color
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        
        # Calcular el color promedio (ignorando los bordes para evitar fondos)
        center_roi = lab[25:75, 25:75]
        avg_color = np.mean(center_roi, axis=(0, 1))
        
        # Convertir de vuelta a BGR para nombrar el color
        avg_bgr = cv2.cvtColor(np.uint8([[avg_color]]), cv2.COLOR_LAB2BGR)[0][0]
        
        # Lógica simple de nombres de colores
        b, g, r = avg_bgr
        if r > 180 and g < 100 and b < 100: return "Rojo"
        if g > 180 and r < 100 and b < 100: return "Verde"
        if b > 180 and r < 100 and g < 100: return "Azul"
        if r > 200 and g > 200 and b < 100: return "Amarillo"
        if r > 200 and g > 150 and b > 150: return "Rosa / Pastel"
        if r < 50 and g < 50 and b < 50: return "Negro / Oscuro"
        if r > 200 and g > 200 and b > 200: return "Blanco / Claro"
        
        return "Multicolor / Mezcla"
    except:
        return "No detectado"
