import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QRCodigo({ valor }: { valor: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(valor, { width: 480, margin: 1, color: { dark: '#1E2A2B', light: '#FFFFFF' } }).then(setSrc)
  }, [valor])
  return (
    <figure className="qr">
      {src ? <img src={src} alt={`Código QR ${valor}`} width={240} height={240} /> : <div className="qr__vacio" />}
      <figcaption>{valor}</figcaption>
    </figure>
  )
}
