import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { pollDisplay } from '../api'
import QRCode from '../components/QRCode'
import ResultRenderer from '../components/ResultRenderer'
import { t } from '../i18n'

interface DisplayPayload {
  query: string
  answer: string
  ts: number
}

export default function Display() {
  const [params] = useSearchParams()
  const sid = params.get('sid') ?? ''
  const [payload, setPayload] = useState<DisplayPayload | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const inputUrl = `${window.location.origin}/input?sid=${encodeURIComponent(sid)}`

  useEffect(() => {
    if (!sid) return
    intervalRef.current = setInterval(async () => {
      const data = await pollDisplay(sid)
      if (data && typeof data === 'object') {
        setPayload(data as DisplayPayload)
      }
    }, 1500)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sid])

  return (
    <div className="min-h-screen flex" style={{ background: '#050508' }}>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        {payload ? (
          <div className="w-full max-w-5xl">
            <p className="text-2xl font-light mb-8" style={{ color: '#94a3b8' }}>
              {payload.query}
            </p>
            <div style={{ fontSize: '1.5rem' }}>
              <ResultRenderer text={payload.answer} />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-6xl mb-6" style={{ color: '#1e293b' }}>✦</p>
            <p className="text-xl font-light" style={{ color: '#334155' }}>
              {t('waiting')}
            </p>
          </div>
        )}
      </div>

      {/* Right sidebar: QR */}
      <div className="flex flex-col items-center justify-end p-8 gap-4"
        style={{ borderLeft: '1px solid #0f172a' }}>
        <QRCode value={inputUrl} size={140} />
        <p className="text-xs text-center" style={{ color: '#1e293b', maxWidth: '140px', wordBreak: 'break-all' }}>
          {t('scan_hint')}
        </p>
      </div>
    </div>
  )
}
