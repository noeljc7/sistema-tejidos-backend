from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Tejedora(Base):
    __tablename__ = "tejedoras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    foto_perfil = Column(String, nullable=True)
    biometria = Column(String, nullable=True)
    
    productos = relationship("Producto", back_populates="tejedora")

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String)
    color = Column(String)
    foto_producto = Column(String)
    peso_gramos = Column(Integer, nullable=True)
    precio_sugerido = Column(Integer, nullable=True)
    estado = Column(String, default="terminado")
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    
    tejedora_id = Column(Integer, ForeignKey("tejedoras.id"))
    tejedora = relationship("Tejedora", back_populates="productos")
