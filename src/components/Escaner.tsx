import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onLeer: (codigo: string) => void
  pausado: boolean
}

/** Escáner con la cámara trasera. Ignora lecturas repetidas mientras está en pausa. */
export function Escaner({ onLeer, pausado }: Props) {
  const ref = useRef<Html5Qrcode | null>(null)
  const pausadoRef = useRef(pausado)
  const onLeerRef = useRef(onLeer)
  const [error, setError] = useState('')
  pausadoRef.current = pausado
  onLeerRef.current = onLeer

  useEffect(() => {
    const escaner = new Html5Qrcode('lector-qr', { verbose: false })
    ref.current = escaner
    escaner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (texto) => !pausadoRef.current && onLeerRef.current(texto),
        () => {},
      )
      .catch(() => setError('No pudimos abrir la cámara. Revisa los permisos o escribe el código a mano.'))
    return () => {
      if (escaner.isScanning) escaner.stop().then(() => escaner.clear()).catch(() => {})
    }
  }, [])

  return (
    <div className="escaner">
      <div id="lector-qr" />
      {error && <p className="aviso aviso--error">{error}</p>}
    </div>
  )
}
