// Esta función detecta automáticamente la IP de tu PC basándose en la URL que abres en el móvil
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Si hostname es localhost o 127.0.0.1, usamos el puerto 8000 en el mismo host
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://localhost:8000`;
    }
    return `http://${hostname}:8000`;
  }
  return "http://localhost:8000";
};

const headers = {
  "Bypass-Tunnel-Reminder": "true"
};

export async function getTejedoras() {
  const response = await fetch(`${getApiUrl()}/tejedoras/`, { headers });
  return response.json();
}

export async function createTejedora(nombre: string, foto?: File) {
  const formData = new FormData();
  formData.append("nombre", nombre);
  if (foto) {
    formData.append("foto", foto);
  }

  const response = await fetch(`${getApiUrl()}/tejedoras/`, {
    method: "POST",
    headers: headers,
    body: formData,
  });
  return response.json();
}

export async function getProductos() {
  const response = await fetch(`${getApiUrl()}/productos/`, { headers });
  return response.json();
}

export async function identificarTejedora(foto: File) {
  const formData = new FormData();
  formData.append("foto", foto);

  const response = await fetch(`${getApiUrl()}/identificar-tejedora/`, {
    method: "POST",
    headers: headers,
    body: formData,
  });
  return response.json();
}

export async function analizarProducto(foto: File) {
  const formData = new FormData();
  formData.append("foto", foto);

  const response = await fetch(`${getApiUrl()}/analizar-producto/`, {
    method: "POST",
    headers: headers,
    body: formData,
  });
  return response.json();
}

export async function createProducto(tipo: string, color: string, tejedoraId: number, foto: File) {
  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append("color", color);
  formData.append("tejedora_id", tejedoraId.toString());
  formData.append("foto", foto);

  const response = await fetch(`${getApiUrl()}/productos/`, {
    method: "POST",
    headers: headers,
    body: formData,
  });
  return response.json();
}

export async function deleteTejedora(id: number) {
  const response = await fetch(`${getApiUrl()}/tejedoras/${id}`, {
    method: "DELETE",
    headers: headers,
  });
  return response.json();
}

export async function deleteProducto(id: number) {
  const response = await fetch(`${getApiUrl()}/productos/${id}`, {
    method: "DELETE",
    headers: headers,
  });
  return response.json();
}

export async function limpiarTodo() {
  const response = await fetch(`${getApiUrl()}/limpiar-todo/`, {
    method: "DELETE",
    headers: headers,
  });
  return response.json();
}
