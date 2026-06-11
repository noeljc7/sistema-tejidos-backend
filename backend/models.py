from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Tejedora(Base):
    __tablename__ = "tejedoras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    foto_perfil = Column(String, nullable=True)  # Ruta a la imagen
    biometria = Column(String, nullable=True)     # Datos biométricos (ej: encoding facial)
    
    productos = relationship("Producto", back_populates="tejedora")

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String)                         # Ej: Chompa, Manta
    color = Column(String)
    foto_producto = Column(String)                # Ruta a la imagen
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    
    tejedora_id = Column(Integer, ForeignKey("tejedoras.id"))
    tejedora = relationship("Tejedora", back_populates="productos")
