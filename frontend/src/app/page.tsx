'use client'

import { useState, useEffect } from 'react'
import { getTejedoras, getProductos, createTejedora, createProducto, identificarTejedora, analizarProducto, deleteTejedora, deleteProducto, limpiarTodo } from '@/lib/api'
import Camera from '@/components/Camera'

export default function Home() {
  const [tejedoras, setTejedoras] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [color, setColor] = useState('')
  const [tejedoraId, setTejedoraId] = useState('')
  const [fotoTejedora, setFotoTejedora] = useState<Blob | null>(null)
  const [fotoProducto, setFotoProducto] = useState<Blob | null>(null)
  const [identificando, setIdentificando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [serverStatus, setServerStatus] = useState<'buscando' | 'online' | 'offline'>('buscando')

  useEffect(() => {
    refreshData()
    checkServer()
  }, [])

  const checkServer = async () => {
    // Usar la misma lógica que en lib/api.ts para obtener la URL correcta
    let url = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`
    
    // Si la URL es la de localhost pero estamos en la nube, corregir
    if (typeof window !== "undefined" && !url.includes('onrender.com') && !window.location.hostname.includes('localhost')) {
        url = `https://${window.location.hostname.replace('vercel.app', 'onrender.com')}` // Intento de fallback
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Más tiempo para el despertar de Render

      const res = await fetch(`${url}/`, {
        headers: { "Bypass-Tunnel-Reminder": "true" },
        signal: controller.signal
      })
      clearTimeout(timeoutId);
      
      if (res.ok) setServerStatus('online')
      else setServerStatus('offline')
    } catch (err) {
      console.log("Error de conexión:", err)
      setServerStatus('offline')
    }
  }

  const refreshData = async () => {
    try {
      const t = await getTejedoras()
      const p = await getProductos()
      setTejedoras(Array.isArray(t) ? t : [])
      setProductos(Array.isArray(p) ? p : [])
    } catch (err) {
      console.error("Error al cargar datos:", err)
    }
  }

  const handleDeleteTejedora = async (id: number) => {
    if (confirm("¿Seguro que quieres borrar esta tejedora y sus datos faciales?")) {
      await deleteTejedora(id)
      refreshData()
    }
  }

  const handleDeleteProducto = async (id: number) => {
    if (confirm("¿Borrar este producto del catálogo?")) {
      await deleteProducto(id)
      refreshData()
    }
  }

  const handleLimpiarTodo = async () => {
    if (confirm("⚠️ ¡ADVERTENCIA! Se borrarán TODAS las tejedoras y TODOS los productos. ¿Continuar?")) {
      await limpiarTodo()
      refreshData()
    }
  }

  const handleCaptureProducto = async (blob: Blob) => {
    setFotoProducto(blob)
    setIdentificando(true)
    try {
      const file = new File([blob], "detect.jpg", { type: "image/jpeg" })
      
      // 1. Identificar Tejedora
      const result = await identificarTejedora(file)
      if (result && result.id) {
        setTejedoraId(result.id.toString())
        console.log("IA Detectada:", result);
      }

      // 2. Analizar Producto (IA)
      const analisis = await analizarProducto(file)
      if (analisis) {
        setColor(analisis.color)
        setTipo(analisis.tipo)
      }
      
      if (result && result.id) {
        alert(`¡Tejedora identificada: ${result.nombre}!\nColor detectado: ${analisis?.color}`)
      } else {
        alert(result?.nombre || "No se pudo reconocer a la tejedora.")
      }
    } catch (err) {
      console.error("Error identificando:", err)
    } finally {
      setIdentificando(false)
    }
  }

  const handleRegisterTejedora = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fotoTejedora) {
      alert("⚠️ Toma la foto antes de guardar.")
      return
    }
    setCargando(true)
    try {
      const file = new File([fotoTejedora], "tejedora.jpg", { type: "image/jpeg" })
      await createTejedora(nombre, file)
      alert("✅ ¡PERFIL GUARDADO CON ÉXITO!")
      setNombre('')
      setFotoTejedora(null)
      refreshData()
    } catch (err) {
      console.error("Error al guardar:", err)
      alert("❌ Error al guardar.")
    } finally {
      setCargando(false)
    }
  }

  const handleRegisterProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fotoProducto) {
      alert("⚠️ Por favor, toma una foto del producto.")
      return
    }
    setCargando(true)
    try {
      let fileToUpload = new File([fotoProducto], "producto.jpg", { type: "image/jpeg" })

      // Compresión IA
      const options = {
        maxSizeMB: 0.3, // Máximo 300KB
        maxWidthOrHeight: 1024,
        useWebWorker: true
      }
      try {
        const compressedFile = await imageCompression(fileToUpload, options)
        fileToUpload = new File([compressedFile], "producto_comp.jpg", { type: "image/jpeg" })
        console.log("Producto comprimido de:", (fotoProducto.size / 1024).toFixed(2), "KB a:", (compressedFile.size / 1024).toFixed(2), "KB")
      } catch (e) {
        console.error("Error comprimiendo producto:", e)
      }

      await createProducto(tipo, color, parseInt(tejedoraId), fileToUpload)
      alert("✅ ¡Producto registrado en el catálogo!")
      setTipo('')
      setColor('')
      setFotoProducto(null)
      setTejedoraId('')
      refreshData()
    } catch (err) {
      alert("❌ No se pudo guardar el producto.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-900">🧶 Sistema de Tejidos</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLimpiarTodo}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition shadow-md"
            >
              🗑️ Borrar Todo
            </button>
            <div className="flex flex-col items-end">
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                serverStatus === 'online' ? 'bg-green-100 text-green-700' : 
                serverStatus === 'offline' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                ● Servidor: {serverStatus}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 font-mono text-gray-900">
                URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
              </span>
            </div>
          </div>
        </div>

        {/* Panel de Estadísticas y Estado de IA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-200">
            <p className="text-indigo-100 text-sm font-medium">Tejedoras activas</p>
            <p className="text-4xl font-bold mt-1">{tejedoras.length}</p>
            <div className="mt-4 flex -space-x-2">
              {tejedoras.slice(0, 5).map(t => (
                <div key={t.id} className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-indigo-300 overflow-hidden">
                  <img src={`http://${window.location.hostname}:8000/${t.foto_perfil}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {tejedoras.length > 5 && <div className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-indigo-500 flex items-center justify-center text-[10px] font-bold">+{tejedoras.length - 5}</div>}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-100 border border-gray-50">
            <p className="text-gray-400 text-sm font-medium">Productos en catálogo</p>
            <p className="text-4xl font-bold mt-1 text-gray-800">{productos.length}</p>
            <p className="text-xs text-green-500 font-bold mt-2">↑ {productos.length > 0 ? 'Actualizado' : 'Listo para empezar'}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-100 border border-gray-50 flex flex-col justify-between">
            <p className="text-gray-400 text-sm font-medium">Motor de IA</p>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Reconocimiento Facial</span>
                <span className="text-indigo-600 font-bold">YuNet + SFace</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 font-medium">Análisis de Color</span>
                <span className="text-indigo-600 font-bold">LAB Vision AI</span>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sección de Tejedoras */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-100">
          <h2 className="text-xl font-semibold mb-4 text-indigo-700">1. Registrar Tejedora</h2>
          <div className="mb-6">
            <Camera onCapture={(blob) => setFotoTejedora(blob)} label="Registro" />
            {fotoTejedora && (
              <div className="mt-4 flex flex-col items-center">
                <p className="text-green-600 text-sm font-medium mb-2">✅ Foto capturada</p>
                <img 
                  src={URL.createObjectURL(fotoTejedora)} 
                  alt="Vista previa" 
                  className="w-32 h-32 object-cover rounded-full border-4 border-indigo-100 shadow-md"
                />
              </div>
            )}
          </div>
          <form onSubmit={handleRegisterTejedora} className="space-y-4">
            <input 
              type="text" 
              placeholder="Nombre Completo" 
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition text-gray-900 bg-white"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <button 
              disabled={cargando}
              className={`w-full py-3 rounded-xl font-bold shadow-lg transition ${cargando ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {cargando ? '⏳ Guardando...' : 'Guardar Perfil de Tejedora'}
            </button>
          </form>

          <h3 className="text-xl font-semibold mt-10 mb-4 border-b pb-2">Tejedoras Registradas</h3>
          <div className="flex flex-wrap gap-4">
            {tejedoras.length === 0 && <p className="text-gray-400 text-sm italic">No hay tejedoras registradas...</p>}
            {tejedoras.map((t) => (
              <div key={t.id} className="relative flex flex-col items-center bg-indigo-50 p-3 rounded-xl w-24 text-center border border-indigo-100">
                <button 
                  onClick={() => handleDeleteTejedora(t.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] font-bold shadow-md hover:bg-red-600 transition z-20 flex items-center justify-center border-2 border-white"
                  title="Eliminar tejedora"
                >
                  ✕
                </button>
                <div className="w-16 h-16 bg-indigo-200 rounded-full mb-2 overflow-hidden border-2 border-white shadow relative">
                  {t.foto_perfil && <img src={`http://${window.location.hostname}:8000/${t.foto_perfil}`} alt={t.nombre} className="w-full h-full object-cover" />}
                  {t.biometria && (
                    <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center" title="Biometría guardada">
                      <span className="text-[8px] text-white">✓</span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full text-gray-800">{t.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sección de Productos */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-green-100">
          <h2 className="text-xl font-semibold mb-4 text-green-700">2. Entrega de Producto</h2>
          <div className="mb-6">
            <Camera onCapture={handleCaptureProducto} label="Producto" />
            {identificando && <p className="text-indigo-600 text-center mt-2 font-medium animate-pulse">🔍 Reconociendo tejedora...</p>}
            {fotoProducto && !identificando && (
              <div className="mt-4 flex flex-col items-center">
                <p className="text-green-600 text-sm font-medium mb-2">✅ Foto lista</p>
                <img 
                  src={URL.createObjectURL(fotoProducto)} 
                  alt="Vista previa" 
                  className="w-full h-32 object-contain rounded-xl border-2 border-green-100 shadow-sm"
                />
              </div>
            )}
          </div>
          <form onSubmit={handleRegisterProducto} className="space-y-4">
            <select 
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none transition text-gray-900 bg-white"
              value={tejedoraId}
              onChange={(e) => setTejedoraId(e.target.value)}
              required
            >
              <option value="">¿Quién entrega?</option>
              {tejedoras.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Prenda (ej: Manta)" 
                className="p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none transition text-gray-900 bg-white"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              />
              <input 
                type="text" 
                placeholder="Color" 
                className="p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none transition text-gray-900 bg-white"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
              />
            </div>
            <button 
              disabled={cargando}
              className={`w-full py-3 rounded-xl font-bold shadow-lg transition ${cargando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            >
              {cargando ? '⏳ Registrando...' : 'Registrar en Catálogo'}
            </button>
          </form>

          <h3 className="text-xl font-semibold mt-10 mb-4 border-b pb-2 flex items-center gap-2">
            <span className="text-2xl">🖼️</span> Catálogo de Productos IA
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {productos.length === 0 && <p className="text-gray-400 text-center col-span-2 py-8 italic">El catálogo está vacío...</p>}
            {productos.map((p) => {
              const tejedora = tejedoras.find(t => t.id === p.tejedora_id);
              return (
                <div key={p.id} className="bg-white p-0 rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition group">
                  <div className="relative h-40 w-full bg-gray-100">
                    <img 
                      src={p.foto_producto?.startsWith('http') ? p.foto_producto : `http://${window.location.hostname}:8000/${p.foto_producto}`} 
                      alt={p.tipo} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm uppercase text-gray-800">
                      {p.color}
                    </div>
                    <button 
                      onClick={() => handleDeleteProducto(p.id)}
                      className="absolute top-2 left-2 bg-red-500 text-white w-7 h-7 rounded-lg text-xs font-bold shadow-lg flex items-center justify-center hover:bg-red-600 transition z-30 border border-white/50"
                      title="Eliminar producto"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-800">{p.tipo}</p>
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">IA OK</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                        {tejedora?.nombre.charAt(0) || '?'}
                      </div>
                      <span>Hecho por: <span className="font-semibold text-gray-700">{tejedora?.nombre || 'Desconocida'}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </main>
  )
}
