'use client'

import { useRef, useState, useEffect } from 'react'

interface CameraProps {
  onCapture: (blob: Blob) => void
  label?: string
}

export default function Camera({ onCapture, label = "Capturar Foto" }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  
  // Decidir qué cámara usar: 'user' para Perfil (selfie), 'environment' para Producto (trasera)
  const facingMode = label.toLowerCase().includes('registro') ? 'user' : 'environment'

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // Restricciones simplificadas para máxima compatibilidad móvil
      const constraints = { 
        video: { 
          facingMode: facingMode
        }, 
        audio: false 
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setIsCameraOpen(true)

      // Usamos un pequeño delay y eventos explícitos para móviles
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Error en play:", e))
          }
        }
      }, 300)

    } catch (err) {
      console.error("Error al acceder a la cámara:", err)
      alert("⚠️ No se pudo abrir la cámara en vivo. \n\nUsa el botón 'Tomar Foto Directa' en su lugar.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsCameraOpen(false)
    }
  }

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      // Ajustar resolución según el video real
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Si es cámara frontal, espejamos la captura para que sea natural
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          onCapture(blob)
          stopCamera()
        }
      }, 'image/jpeg', 0.90)
    }
  }

  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
    }
  }

  // Limpiar stream al desmontar el componente
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
      {!isCameraOpen ? (
        <div className="flex flex-col space-y-3 w-full">
          <button 
            type="button"
            onClick={startCamera}
            className="bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-3 shadow-md active:scale-95"
          >
            <span className="text-xl">📹</span> Usar Cámara en Vivo
          </button>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-white px-3 text-gray-400">O la aplicación del móvil</span>
            </div>
          </div>

          <label className="cursor-pointer bg-gray-50 border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold text-center hover:bg-gray-100 transition flex items-center justify-center gap-3 active:scale-95">
            <span className="text-xl">📸</span> Tomar Foto Directa
            <input 
              type="file" 
              accept="image/*" 
              capture={facingMode === 'user' ? 'user' : 'environment'}
              className="hidden" 
              onChange={handleNativeCapture}
            />
          </label>
          <p className="text-[10px] text-center text-gray-400 italic">
            Tip: La cámara en vivo requiere HTTPS. Si falla, usa 'Foto Directa'.
          </p>
        </div>
      ) : (
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black shadow-2xl">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-auto ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-center">
            <button 
              type="button"
              onClick={stopCamera}
              className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={takePhoto}
              className="bg-white text-indigo-600 w-16 h-16 rounded-full font-bold shadow-xl flex items-center justify-center active:scale-90 transition border-4 border-indigo-100"
            >
              <div className="w-10 h-10 rounded-full border-2 border-indigo-600"></div>
            </button>
            <button 
              type="button"
              onClick={toggleCamera}
              className="bg-white/20 backdrop-blur-md text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/30 transition"
              title="Cambiar Cámara"
            >
              🔄
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
