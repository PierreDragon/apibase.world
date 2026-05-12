import { useEffect, useRef } from 'react'
import QRCodeLib from 'qrcode'

interface Props {
  value: string
  size?: number
}

export default function QRCode({ value, size = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#a78bfa', light: '#050508' },
    })
  }, [value, size])

  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '8px' }} />
}
