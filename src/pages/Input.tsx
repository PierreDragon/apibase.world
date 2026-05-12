import { useState, type FormEvent, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Input() {
  const [params] = useSearchParams()
  const sid = params.get('sid') ?? ''
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || busy) return
    setBusy(true)
    setSent(false)
    setError('')

    try {
      const res = await fetch('/api/nql_mobile.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid, prompt: q }),
      })
      const data = await res.json()
      if (data.ok) {
        setInput('')
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      } else {
        setError(data.error ?? 'An error occurred.')
      }
    } catch {
      setError('Unable to reach the server.')
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
          <p className="text-xs mt-2" style={{ color: '#334155' }}>Mobile mode</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            ref={inputRef}
            rows={4}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your question…"
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
            {busy ? 'Sending…' : 'Send →'}
          </button>
        </form>

        {sent && (
          <p className="text-center text-sm" style={{ color: '#34d399' }}>
            ✓ Displayed on plasma
          </p>
        )}
        {error && (
          <p className="text-center text-sm" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
