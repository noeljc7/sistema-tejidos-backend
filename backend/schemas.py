from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductoBase(BaseModel):
    tipo: str
    color: str
    peso_gramos: Optional[int] = None
    precio_sugerido: Optional[int] = None
    estado: Optional[str] = "terminado"

class ProductoCreate(ProductoBase):
    tejedora_id: int

class Producto(ProductoBase):
    id: int
    foto_producto: str
    fecha_registro: datetime
    tejedora_id: int
    peso_gramos: Optional[int] = None
    precio_sugerido: Optional[int] = None
    estado: Optional[str] = "terminado"

    model_config = {"from_attributes": True}

class TejedoraBase(BaseModel):
    nombre: str

class TejedoraCreate(TejedoraBase):
    pass

class Tejedora(TejedoraBase):
    id: int
    foto_perfil: Optional[str] = None
    productos: List[Producto] = []

    model_config = {"from_attributes": True}
