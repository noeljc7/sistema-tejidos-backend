from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import json
import cloudinary
import cloudinary.uploader
import numpy as np
import cv2

import models
import schemas
import database
import vision_utils
from database import engine, get_db

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv()

# Configurar Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Crear las tablas en la base de datos (PostgreSQL)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Reconocimiento de Tejidos API - CLOUD")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "API de Tejidos en la NUBE activa"}

# --- Funciones Auxiliares para Imagenes ---

async def upload_to_cloudinary(file: UploadFile, folder: str):
    try:
        result = cloudinary.uploader.upload(file.file, folder=f"tejidos/{folder}")
        return result.get("secure_url")
    except Exception as e:
        print(f"Error subiendo a Cloudinary: {e}")
        return None

# --- Endpoints para Tejedoras ---

@app.post("/tejedoras/", response_model=schemas.Tejedora)
async def create_tejedora(nombre: str = Form(...), foto: UploadFile = File(None), db: Session = Depends(get_db)):
    db_tejedora = models.Tejedora(nombre=nombre)
    
    if foto:
        # 1. Guardar temporalmente para procesar IA
        temp_path = f"temp_{uuid.uuid4()}.jpg"
        with open(temp_path, "wb") as buffer:
            import shutil
            shutil.copyfileobj(foto.file, buffer)
        
        # 2. IA: Generar biometría facial
        encoding = vision_utils.get_face_encoding(temp_path)
        if encoding:
            db_tejedora.biometria = json.dumps(encoding)
        
        # 3. Subir a la Nube (Cloudinary)
        foto.file.seek(0) # Resetear puntero del archivo
        url_nube = await upload_to_cloudinary(foto, "perfiles")
        db_tejedora.foto_perfil = url_nube
        
        os.remove(temp_path)

    db.add(db_tejedora)
    db.commit()
    db.refresh(db_tejedora)
    return db_tejedora

@app.post("/identificar-tejedora/")
async def identificar_tejedora(foto: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_path = f"temp_id_{uuid.uuid4()}.jpg"
    with open(temp_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(foto.file, buffer)
    
    unknown_encoding = vision_utils.get_face_encoding(temp_path)
    os.remove(temp_path)
    
    if not unknown_encoding:
        return {"id": None, "nombre": "No se detectó rostro"}

    tejedoras = db.query(models.Tejedora).filter(models.Tejedora.biometria != None).all()
    known_encodings = {t.id: json.loads(t.biometria) for t in tejedoras}
    
    matched_id, score = vision_utils.compare_faces(unknown_encoding, known_encodings)
    
    if matched_id:
        tejedora = db.query(models.Tejedora).filter(models.Tejedora.id == matched_id).first()
        return {"id": tejedora.id, "nombre": tejedora.nombre, "confianza": f"{score:.2f}"}
    
    return {"id": None, "nombre": "Desconocida", "confianza": f"{score:.2f}"}

@app.get("/tejedoras/", response_model=List[schemas.Tejedora])
def read_tejedoras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Tejedora).offset(skip).limit(limit).all()

# --- Endpoints para Productos ---

@app.post("/analizar-producto/")
async def analizar_producto(foto: UploadFile = File(...)):
    temp_path = f"temp_prod_{uuid.uuid4()}.jpg"
    with open(temp_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(foto.file, buffer)
    
    color_detectado = vision_utils.detect_product_color(temp_path)
    os.remove(temp_path)
    
    return {"color": color_detectado, "tipo": "Tejido manual"}

@app.post("/productos/", response_model=schemas.Producto)
async def create_producto(
    tipo: str = Form(...), 
    color: str = Form(...), 
    tejedora_id: int = Form(...),
    peso_gramos: Optional[int] = Form(None),
    precio_sugerido: Optional[int] = Form(None),
    estado: Optional[str] = Form("terminado"),
    foto: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    tejedora = db.query(models.Tejedora).filter(models.Tejedora.id == tejedora_id).first()
    if not tejedora:
        raise HTTPException(status_code=404, detail="Tejedora no encontrada")

    url_nube = await upload_to_cloudinary(foto, "productos")

    db_producto = models.Producto(
        tipo=tipo, 
        color=color, 
        tejedora_id=tejedora_id,
        foto_producto=url_nube,
        peso_gramos=peso_gramos,
        precio_sugerido=precio_sugerido,
        estado=estado
    )
        peso_gramos=peso_gramos,
        precio_sugerido=precio_sugerido,
        estado=estado
    )
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto

@app.get("/productos/", response_model=List[schemas.Producto])
def read_productos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Producto).offset(skip).limit(limit).all()

@app.delete("/tejedoras/{tejedora_id}")
def delete_tejedora(tejedora_id: int, db: Session = Depends(get_db)):
    tejedora = db.query(models.Tejedora).filter(models.Tejedora.id == tejedora_id).first()
    if not tejedora:
        raise HTTPException(status_code=404, detail="Tejedora no encontrada")
    db.delete(tejedora)
    db.commit()
    return {"message": "Tejedora eliminada"}

@app.delete("/productos/{producto_id}")
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(producto)
    db.commit()
    return {"message": "Producto eliminado"}

@app.delete("/limpiar-todo/")
def limpiar_todo(db: Session = Depends(get_db)):
    db.query(models.Producto).delete()
    db.query(models.Tejedora).delete()
    db.commit()
    return {"message": "Base de datos limpiada por completo"}
