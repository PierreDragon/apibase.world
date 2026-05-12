import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { nqlQuery } from '../api'
import ResultRenderer from '../components/ResultRenderer'

interface Message {
  role: 'user' | 'assistant'
  text: string
  loading?: boolean
}

export default function NQL() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const host    = sessionStorage.getItem('nql_host') ?? ''
  const user    = sessionStorage.getItem('nql_user') ?? ''
  const pass    = sessionStorage.getItem('nql_pass') ?? ''
  const idToken = parseInt(sessionStorage.getItem('nql_id_token') ?? '0', 10)
  const base    = sessionStorage.getItem('nql_base') ?? ''

  useEffect(() => {
    if (!host || !user || !pass || !idToken || !base) navigate('/login')
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function logout() {
    sessionStorage.clear()
    navigate('/login')
  }

  async function openDisplay() {
    const sid = `${user}_${idToken}_${base}`
    await fetch('/api/session.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid, host, username: user, password: pass, id_token: idToken, base }),
    })
    window.open(`/display?sid=${encodeURIComponent(sid)}`, '_blank')
  }

  async function sendQuery() {
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    setBusy(true)

    setMessages(prev => [
      ...prev,
      { role: 'user', text: q },
      { role: 'assistant', text: '', loading: true },
    ])

    try {
      const res = await nqlQuery(host, user, pass, idToken, base, q)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          text: res.ok ? (res.answer ?? '') : (res.error ?? 'Erreur inattendue.'),
          loading: false,
        }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', text: 'Unable to reach the server.', loading: false }
        return updated
      })
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery()
    }
  }

  const suggestions = [
    'Who are my top 5 customers this month?',
    'How many orders are pending?',
    'Mark order #1042 as shipped.',
  ]

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0f' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #1e1e2e', background: '#0d0d14' }}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-white tracking-tight">APIBASE</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)' }}>
            NQL
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Context badge */}
          <div className="hidden sm:flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
            <span className="font-mono" style={{ color: '#64748b' }}>{host}</span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span className="font-mono px-2 py-0.5 rounded"
              style={{ background: '#1e1e2e', color: '#a78bfa' }}>
              {base}
            </span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span>token #{idToken}</span>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'none', color: '#475569', border: '1px solid #1e1e2e', cursor: 'pointer' }}>
              Clear
            </button>
          )}
          <button onClick={openDisplay}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: '#1e1e2e', color: '#94a3b8', border: '1px solid #2d2d3e', cursor: 'pointer' }}>
            ⎋ Plasma
          </button>
          <button onClick={logout} className="text-xs" style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 w-full px-2">
        {messages.length === 0 && (
          <div className="text-center pt-16">
            <p className="text-4xl mb-4">✦</p>
            <p className="font-semibold text-white text-lg mb-1">Ask a question</p>
            <p className="text-sm mb-6" style={{ color: '#475569' }}>
              NQL translates your request into a precise APIBASE operation on <span className="font-mono" style={{ color: '#64748b' }}>{base}</span>.
            </p>
            <div className="space-y-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="block w-full text-left text-sm px-4 py-3 rounded-xl transition-all"
                  style={{ background: '#12121a', color: '#64748b', border: '1px solid #1e1e2e', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#64748b' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-xl px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
                {msg.text}
              </div>
            ) : (
              <div className="w-full">
                {msg.loading ? (
                  <div className="flex items-center gap-2 px-2 py-3">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: '#7c3aed', animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-2xl" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
                    <ResultRenderer text={msg.text} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 w-full px-2">
        <div className="flex items-end gap-3 px-4 py-3 rounded-2xl"
          style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question in natural language…"
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ color: '#e2e8f0', maxHeight: '120px' }}
          />
          <button onClick={sendQuery} disabled={!input.trim() || busy}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !busy ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(109,40,217,0.25)',
              color: input.trim() && !busy ? '#fff' : '#7c3aed',
              border: 'none',
              cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
            }}>
            ↑
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: '#1e293b' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
