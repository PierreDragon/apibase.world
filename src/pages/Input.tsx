import { useState, type FormEvent, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { nqlQuery, pushToDisplay } from '../api'

export default function Input() {
  const [params] = useSearchParams()
  const sid = params.get('sid') ?? ''
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Credentials come from sessionStorage (same browser session) or are absent on mobile scan
  // On mobile scan: the sid encodes host/user/idToken/base — we store them in push.php context
  // For now Input page just relays: sid is used to push to display
  const host    = sessionStorage.getItem('nql_host') ?? ''
  const user    = sessionStorage.getItem('nql_user') ?? ''
  const pass    = sessionStorage.getItem('nql_pass') ?? ''
  const idToken = parseInt(sessionStorage.getItem('nql_id_token') ?? '0', 10)
  const base    = sessionStorage.getItem('nql_base') ?? ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || busy) return
    setBusy(true)
    setSent(false)

    try {
      if (host && user && pass && idToken && base) {
        const res = await nqlQuery(host, user, pass, idToken, base, q)
        if (res.ok) {
          await pushToDisplay(sid, { query: q, answer: res.answer ?? '', ts: Date.now() })
          setInput('')
          setSent(true)
          setTimeout(() => setSent(false), 3000)
        }
      }
    } catch {
      // silent on mobile
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <span className="font-bold text-white tracking-tight">APIBASE</span>
          <span className="text-xs font-semibold ml-2 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)' }}>
            NQL
          </span>
          <p className="text-xs mt-2" style={{ color: '#334155' }}>Mode mobile · {base || 'sans base'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            ref={inputRef}
            rows={4}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Posez votre question…"
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#12121a', border: '1px solid #1e1e2e', color: '#e2e8f0' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: input.trim() && !busy ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#1e1e2e',
              color: input.trim() && !busy ? '#fff' : '#475569',
              border: 'none',
              cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
            }}>
            {busy ? 'Envoi…' : 'Envoyer →'}
          </button>
        </form>

        {sent && (
          <p className="text-center text-sm" style={{ color: '#34d399' }}>
            ✓ Affiché sur le plasma
          </p>
        )}
      </div>
    </div>
  )
}
