import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { t } from '../i18n'
import { BUNDLE_RE, CHECK_EVENT, loadedBundle } from '../version'

const CHECK_EVERY_MS = 5 * 60 * 1000

export default function UpdateBanner() {
  const { pathname } = useLocation()
  const [outdated, setOutdated] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const current = loadedBundle()
    if (!current) return
    let busy = false

    async function check() {
      if (busy) return
      busy = true
      try {
        const res = await fetch('/', { cache: 'no-store' })
        const live = BUNDLE_RE.exec(await res.text())?.[0]
        if (live && live !== current) setOutdated(true)
      } catch {
        // offline or server error: try again later
      } finally {
        busy = false
      }
    }

    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    window.addEventListener(CHECK_EVENT, check)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => {
      window.removeEventListener(CHECK_EVENT, check)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [])

  // The plasma display is passive: no banner there.
  if (!outdated || dismissed || pathname.startsWith('/display')) return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-xs"
      style={{ background: '#1e1b4b', color: '#c4b5fd', borderBottom: '1px solid #7c3aed' }}
    >
      <span>{t('update_available')}</span>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1 rounded-lg font-semibold"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        {t('update_reload')}
      </button>
      <button
        onClick={() => setDismissed(true)}
        title={t('update_later')}
        style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '1rem' }}
      >
        ×
      </button>
    </div>
  )
}
