import cv2
import numpy as np
import os
import gc

# Rutas de los modelos
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
YUNET_PATH = os.path.join(MODELS_DIR, "yunet.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "sface.onnx")

# Inicializar modelos de OpenCV
try:
    detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 320), 0.6, 0.3, 5000)
    recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
    print("✅ IA OPTIMIZADA: Memoria controlada.")
except Exception as e:
    print(f"⚠️ Error: {e}")
    detector = None

def get_face_encoding(image_path):
    if detector is None: return None
    try:
        img = cv2.imread(image_path)
        if img is None: return None
        
        # OPTIMIZACIÓN RAM: Redimensionar antes de procesar
        max_dim = 400
        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))

        detector.setInputSize((img.shape[1], img.shape[0]))
        _, faces = detector.detect(img)
        
        if faces is not None:
            face_aligned = recognizer.alignCrop(img, faces[0])
            feature = recognizer.feature(face_aligned)
            encoding = feature.flatten().tolist()
            
            # Limpieza agresiva de RAM
            del img, face_aligned, feature
            gc.collect()
            return encoding
    except Exception as e:
        print(f"Error facial: {e}")
    return None

def detect_product_color(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None: return "Sin datos"
        
        # OPTIMIZACIÓN RAM: Miniatura para análisis
        img = cv2.resize(img, (150, 150))
        roi = img[30:120, 30:120]
        
        pixels = roi.reshape(-1, 3).astype(np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        _, labels, centers = cv2.kmeans(pixels, 2, None, criteria, 5, cv2.KMEANS_RANDOM_CENTERS)
        
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

        primary = get_color_name(centers[0])
        secondary = get_color_name(centers[1]) if len(centers) > 1 else None
        
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        estilo = "Liso"
        if laplacian > 500: estilo = "Texturizado"
        if laplacian > 1500: estilo = "Patrón Complejo"

        desc = f"{primary}"
        if secondary and secondary != primary: desc += f" con {secondary}"
        
        # Limpieza de RAM
        del img, roi, pixels, gray
        gc.collect()
        
        return f"{desc} ({estilo})"
    except:
        return "No detectado"
