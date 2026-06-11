'use client'

import { useState, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { 
  getTejedoras, 
  getProductos, 
  createTejedora, 
  createProducto, 
  identificarTejedora, 
  analizarProducto, 
  deleteTejedora, 
  deleteProducto, 
  limpiarTodo 
} from '@/lib/api'
import Camera from '@/components/Camera'

export default function Home() {
  const [tejedoras, setTejedoras] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [color, setColor] = useState('')
  const [peso, setPeso] = useState('')
  const [precio, setPrecio] = useState('')
  const [estado, setEstado] = useState('terminado')
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
    let url = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`
    if (typeof window !== "undefined" && !url.includes('onrender.com') && !window.location.hostname.includes('localhost')) {
        url = `https://${window.location.hostname.replace('vercel.app', 'onrender.com')}`
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${url}/`, {
        headers: { "Bypass-Tunnel-Reminder": "true" },
        signal: controller.signal
      })
      clearTimeout(timeoutId);
      if (res.ok) setServerStatus('online')
      else setServerStatus('offline')
    } catch (err) {
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
    if (confirm("Confirmar eliminación de artesana y registros biométricos.")) {
      await deleteTejedora(id)
      refreshData()
    }
  }

  const handleDeleteProducto = async (id: number) => {
    if (confirm("Confirmar eliminación de producto del inventario.")) {
      await deleteProducto(id)
      refreshData()
    }
  }

  const handleLimpiarTodo = async () => {
    if (confirm("ATENCIÓN: Se eliminarán todos los registros de artesanas y productos. ¿Desea continuar?")) {
      await limpiarTodo()
      refreshData()
    }
  }

  const handleCaptureProducto = async (blob: Blob) => {
    setFotoProducto(blob)
    setIdentificando(true)
    try {
      const file = new File([blob], "detect.jpg", { type: "image/jpeg" })
      const result = await identificarTejedora(file)
      if (result && result.id) {
        setTejedoraId(result.id.toString())
      }
      const analisis = await analizarProducto(file)
      if (analisis) {
        setColor(analisis.color)
        setTipo(analisis.tipo)
      }
      if (result && result.id) {
        alert(`IDENTIFICACIÓN EXITOSA: ${result.nombre}\nCOLOR DETECTADO: ${analisis?.color}`)
      } else {
        alert(result?.nombre || "No se detectó una identidad registrada.")
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
      alert("Error: Captura de imagen requerida.")
      return
    }
    setCargando(true)
    try {
      let fileToUpload = new File([fotoTejedora], "tejedora.jpg", { type: "image/jpeg" })
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true }
      try {
        const compressedFile = await imageCompression(fileToUpload, options)
        fileToUpload = new File([compressedFile], "tejedora_comp.jpg", { type: "image/jpeg" })
      } catch (e) { console.error(e) }

      await createTejedora(nombre, fileToUpload)
      alert("REGISTRO COMPLETADO")
      setNombre('')
      setFotoTejedora(null)
      refreshData()
    } catch (err) {
      alert("ERROR EN EL REGISTRO")
    } finally {
      setCargando(false)
    }
  }

  const handleRegisterProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fotoProducto) {
      alert("Error: Imagen de producto requerida.")
      return
    }
    setCargando(true)
    try {
      let fileToUpload = new File([fotoProducto], "producto.jpg", { type: "image/jpeg" })
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true }
      try {
        const compressedFile = await imageCompression(fileToUpload, options)
        fileToUpload = new File([compressedFile], "producto_comp.jpg", { type: "image/jpeg" })
      } catch (e) { console.error(e) }

      await createProducto(
        tipo, color, parseInt(tejedoraId), fileToUpload,
        peso ? parseInt(peso) : undefined,
        precio ? parseInt(precio) : undefined,
        estado
      )
      alert("PRODUCTO INGRESADO AL INVENTARIO")
      setTipo(''); setColor(''); setPeso(''); setPrecio(''); setEstado('terminado')
      setFotoProducto(null); setTejedoraId('')
      refreshData()
    } catch (err) {
      alert("ERROR AL INGRESAR PRODUCTO")
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-10 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header Profesional */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-slate-800 uppercase">
              SISTEMA DE <span className="font-semibold text-indigo-600">GESTIÓN TEXTIL</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-[0.2em] font-medium">Control de Producción e Identificación Biométrica</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${serverStatus === 'online' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Servidor {serverStatus}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 font-mono">
                NODE: {process.env.NEXT_PUBLIC_API_URL?.replace('https://', '') || 'LOCAL_HOST'}
              </span>
            </div>
            <button 
              onClick={handleLimpiarTodo}
              className="px-5 py-2 border border-rose-200 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-50 transition-colors"
            >
              Borrar Datos
            </button>
          </div>
        </div>

        {/* Dashboard de Estado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-indigo-600">Artesanas Activas</p>
            <p className="text-5xl font-light text-slate-800 tracking-tighter">{tejedoras.length}</p>
            <div className="mt-6 flex -space-x-3">
              {tejedoras.slice(0, 6).map(t => (
                <div key={t.id} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                  <img src={t.foto_perfil?.startsWith('http') ? t.foto_perfil : `http://${window.location.hostname}:8000/${t.foto_perfil}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-emerald-600">Inventario Total</p>
            <p className="text-5xl font-light text-slate-800 tracking-tighter">{productos.length}</p>
            <div className="mt-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Sincronizado</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Tecnología de Visión</p>
            <div className="space-y-4 mt-4 text-[11px] font-bold uppercase tracking-tighter">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Reconocimiento Facial</span>
                <span className="text-indigo-600">YuNet + SFace</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Cromatismo IA</span>
                <span className="text-emerald-600">LAB Active</span>
              </div>
            </div>
          </div>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Sección de Registro */}
        <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xs font-bold mb-8 uppercase tracking-[0.3em] text-slate-800 border-l-4 border-indigo-600 pl-4">1. Registro de Personal</h2>
          <div className="mb-8 text-indigo-600">
            <Camera onCapture={(blob) => setFotoTejedora(blob)} label="Registro" />
            {fotoTejedora && (
              <div className="mt-6 flex flex-col items-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.2em] mb-4 text-center italic">Imagen de Perfil Capturada</p>
                <img 
                  src={URL.createObjectURL(fotoTejedora)} 
                  alt="Vista previa" 
                  className="w-40 h-40 object-cover rounded-full border-4 border-white shadow-lg"
                />
              </div>
            )}
          </div>
          <form onSubmit={handleRegisterTejedora} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Nombre de la artesana" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-sm"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <button 
              disabled={cargando}
              className={`w-full py-4 rounded-lg font-bold text-[10px] uppercase tracking-[0.3em] shadow-md transition-all ${cargando ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-slate-900 hover:bg-black text-white active:scale-[0.98]'}`}
            >
              {cargando ? 'Procesando...' : 'Finalizar Registro'}
            </button>
          </form>

          <h3 className="text-[10px] font-bold mt-14 mb-6 uppercase tracking-[0.3em] text-slate-400 border-b pb-4">Personal en Sistema</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {tejedoras.length === 0 && <p className="text-slate-400 text-xs italic py-4 text-center col-span-full uppercase tracking-tighter">Sin registros disponibles</p>}
            {tejedoras.map((t) => (
              <div key={t.id} className="group relative flex flex-col items-center bg-white p-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md">
                <button 
                  onClick={() => handleDeleteTejedora(t.id)}
                  className="absolute -top-2 -right-2 bg-white text-slate-400 w-6 h-6 rounded-full border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600 hover:border-rose-200 z-30 flex items-center justify-center text-[10px]"
                >
                  ✕
                </button>
                <div className="w-16 h-16 bg-slate-50 rounded-full mb-3 overflow-hidden border-2 border-white shadow-inner relative ring-1 ring-slate-100">
                  {t.foto_perfil && <img src={t.foto_perfil?.startsWith('http') ? t.foto_perfil : `http://${window.location.hostname}:8000/${t.foto_perfil}`} alt={t.nombre} className="w-full h-full object-cover" />}
                </div>
                <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center tracking-tighter uppercase">{t.nombre}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Sección de Producción */}
        <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xs font-bold mb-8 uppercase tracking-[0.3em] text-slate-800 border-l-4 border-emerald-600 pl-4">2. Gestión de Producción</h2>
          <div className="mb-8">
            <Camera onCapture={handleCaptureProducto} label="Producto" />
            {identificando && (
              <div className="flex flex-col items-center mt-6 p-4">
                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-indigo-500 animate-[loading_1.5s_ease-in-out_infinite]"></div>
                </div>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest animate-pulse italic">Validando Identidad...</p>
              </div>
            )}
          </div>
          <form onSubmit={handleRegisterProducto} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Responsable Identificada</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all text-xs font-bold uppercase"
                value={tejedoraId}
                onChange={(e) => setTejedoraId(e.target.value)}
                required
              >
                <option value="">Seleccione Artesana</option>
                {tejedoras.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Categoría</label>
                <input 
                  type="text" 
                  placeholder="Ej: Manta Alpaca" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all text-xs font-bold uppercase"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Tono Primario</label>
                <input 
                  type="text" 
                  placeholder="Color" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all text-xs font-bold uppercase"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Peso (G)</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all text-xs font-bold"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Valor</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all text-xs font-bold"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Estado</label>
                <select
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all text-xs font-bold uppercase"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="proceso">En Proceso</option>
                  <option value="terminado">Terminado</option>
                  <option value="vendido">Vendido</option>
                </select>
              </div>
            </div>
            
            <button 
              disabled={cargando}
              className={`w-full py-4 rounded-lg font-bold text-[10px] uppercase tracking-[0.3em] shadow-md transition-all ${cargando ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'}`}
            >
              {cargando ? 'Registrando...' : 'Ingresar al Catálogo'}
            </button>
          </form>

          <h3 className="text-[10px] font-bold mt-14 mb-6 uppercase tracking-[0.3em] text-slate-400 border-b pb-4 text-emerald-600">Catálogo de Inventario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {productos.length === 0 && <p className="text-slate-400 text-center col-span-2 py-10 text-xs italic uppercase tracking-widest font-bold">Sin existencias</p>}
            {productos.map((p) => {
              const tejedora = tejedoras.find(t => t.id === p.tejedora_id);
              return (
                <div key={p.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                  <div className="relative h-44 w-full bg-slate-100 border-b border-slate-100">
                    <img 
                      src={p.foto_producto?.startsWith('http') ? p.foto_producto : `http://${window.location.hostname}:8000/${p.foto_producto}`} 
                      alt={p.tipo} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-[8px] font-black shadow-sm uppercase tracking-widest text-slate-700 ring-1 ring-slate-100">
                      {p.color}
                    </div>
                    <button 
                      onClick={() => handleDeleteProducto(p.id)}
                      className="absolute top-3 left-3 bg-rose-500 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 z-30"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <p className="font-bold text-xs text-slate-800 uppercase tracking-[0.1em]">{p.tipo}</p>
                      <span className={`text-[8px] px-2 py-1 rounded font-black tracking-widest uppercase ${
                        p.estado === 'vendido' ? 'bg-amber-100 text-amber-700' :
                        p.estado === 'proceso' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.estado}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <div className="bg-slate-50 p-2 rounded flex flex-col justify-center border border-slate-100">
                        <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Gramos</span>
                        <span className="text-xs font-bold text-slate-700">{p.peso_gramos ? `${p.peso_gramos}g` : '--'}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded flex flex-col justify-center border border-slate-100">
                        <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Valor Unit</span>
                        <span className="text-xs font-bold text-slate-700">{p.precio_sugerido ? `$${p.precio_sugerido}` : '--'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                      <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[7px] font-black text-white">
                        {tejedora?.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none">Artesana Responsable</span>
                        <span className="text-[9px] font-bold text-slate-600 leading-tight uppercase">{tejedora?.nombre || 'NO IDENTIFICADA'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
    <style jsx global>{`
      @keyframes loading {
        from { transform: translateX(-100%); }
        to { transform: translateX(100%); }
      }
    `}</style>
  </main>
  )
}
