import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  nqlQuery, nqlConfirm, nqlFeedback,
  type NQLContext, type NQLHistoryEntry, type NQLMemory, type NQLMode, type NQLPending, type NQLProgram, type NQLResult,
} from '../api'
import ResultRenderer from '../components/ResultRenderer'
import { t } from '../i18n'

type PendingState = 'active' | 'confirming' | 'confirmed' | 'cancelled' | 'replaced' | 'expired' | 'failed'

interface Message {
  role: 'user' | 'assistant'
  text: string
  loading?: boolean
  // Error shown to the person: not sent back as history.
  error?: boolean
  programs?: NQLProgram[]
  pending?: NQLPending
  pendingState?: PendingState
  memory?: NQLMemory[]
  // NQL memory rating token (valid 24 h)
  feedback?: string
  note?: number
  noteState?: 'sending' | 'error'
}

// Only one announcement may await confirmation: a newer one replaces it.
function supersedePending(list: Message[]): Message[] {
  return list.map(m =>
    m.pendingState === 'active' || m.pendingState === 'confirming'
      ? { ...m, pendingState: 'replaced' as const }
      : m,
  )
}

function isExpired(p: NQLPending): boolean {
  return !!p.expires && Date.now() / 1000 >= p.expires
}

// history for api_run: last 8 displayed messages, oldest first, 4000 chars max each.
// Errors and empty messages (a pending table without text) are left out.
const HISTORY_MAX = 8
const HISTORY_CHARS = 4000

function buildHistory(list: Message[]): NQLHistoryEntry[] {
  return list
    .filter(m => !m.loading && !m.error && m.text.trim() !== '')
    .slice(-HISTORY_MAX)
    .map(m => ({ role: m.role, content: m.text.trim().slice(0, HISTORY_CHARS) }))
}

function confirmationText(res: NQLResult): string {
  if (!res.ok) return res.error ?? t('error_generic')
  if (res.status === 'error') {
    const head = [res.code, res.message].filter(Boolean).join(' — ')
    return `${head ? `**${head}**\n\n` : ''}${t('confirm_error')}`
  }
  return res.message ?? ''
}

interface SavedQuery {
  id: string
  name: string
  query: string
  createdAt: string
}

export default function NQL() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [showSaved, setShowSaved] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [savingName, setSavingName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const saveNameRef = useRef<HTMLInputElement>(null)

  const host = sessionStorage.getItem('nql_host') ?? ''
  const user = sessionStorage.getItem('nql_user') ?? ''
  const pass = sessionStorage.getItem('nql_pass') ?? ''
  const idToken = parseInt(sessionStorage.getItem('nql_id_token') ?? '0', 10)
  const base = sessionStorage.getItem('nql_base') ?? ''

  const contextKey = `apibase_nql_context:${host}:${base}:${idToken}:${user}`
  const savedKey   = `apibase_nql_saved:${host}:${base}:${user}`
  const modeKey    = `apibase_nql_mode:${host}`

  // 'auto' = no mode sent: the installation setting applies.
  const [mode, setModeState] = useState<NQLMode | 'auto'>(() => {
    const m = localStorage.getItem(modeKey)
    return m === 'loboc' || m === 'tools' ? m : 'auto'
  })

  function setMode(m: NQLMode | 'auto') {
    if (m === 'auto') localStorage.removeItem(modeKey)
    else localStorage.setItem(modeKey, m)
    setModeState(m)
  }

  useEffect(() => {
    if (!host || !user || !pass || !idToken || !base) {
      navigate('/login')
    }
  }, [host, user, pass, idToken, base, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(savedKey)
      if (raw) setSavedQueries(JSON.parse(raw))
    } catch {
      setSavedQueries([])
    }
  }, [savedKey])

  useEffect(() => {
    if (showSaveInput) {
      saveNameRef.current?.focus()
    }
  }, [showSaveInput])

  function persistSaved(list: SavedQuery[]) {
    localStorage.setItem(savedKey, JSON.stringify(list))
    setSavedQueries(list)
  }

  function confirmSave() {
    const name = savingName.trim()
    const query = input.trim()
    if (!name || !query) return
    const entry: SavedQuery = {
      id: Date.now().toString(),
      name,
      query,
      createdAt: new Date().toISOString(),
    }
    persistSaved([entry, ...savedQueries])
    setSavingName('')
    setShowSaveInput(false)
    inputRef.current?.focus()
  }

  function deleteSaved(id: string) {
    persistSaved(savedQueries.filter(q => q.id !== id))
  }

  function restoreQuery(q: SavedQuery) {
    setInput(q.query)
    setShowSaved(false)
    inputRef.current?.focus()
  }

  function readContext(): NQLContext {
    try {
      const raw = localStorage.getItem(contextKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
      return parsed as NQLContext
    } catch {
      return null
    }
  }

  function saveContext(context: NQLContext) {
    if (!context) {
      localStorage.removeItem(contextKey)
      return
    }
    localStorage.setItem(contextKey, JSON.stringify(context))
  }

  function clearChat() {
    setMessages([])
    saveContext(null)
    inputRef.current?.focus()
  }

  function logout() {
    saveContext(null)
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
    // context only matters in tools mode.
    const context = mode === 'loboc' ? null : readContext()
    // Displayed exchanges, before this question, so the AI understands follow-ups.
    const history = buildHistory(messages)
    setInput('')
    setBusy(true)
    setMessages(prev => [
      ...prev,
      { role: 'user', text: q },
      { role: 'assistant', text: '', loading: true },
    ])
    try {
      const res = await nqlQuery(host, user, pass, idToken, base, q, {
        context,
        mode: mode === 'auto' ? null : mode,
        history,
      })
      // The display follows the mode the answer reports. Fallback for an
      // APIBASE that does not report it yet: LOBOC answers carry programs.
      const loboc = res.mode ? res.mode === 'loboc' : !!res.programs
      if (!loboc && 'context' in res) saveContext(res.context ?? null)
      const pending = loboc && res.ok && res.pending ? res.pending : undefined
      setMessages(prev => {
        const updated = pending ? supersedePending(prev) : [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          text: res.ok ? (res.answer ?? '') : (res.error ?? 'Erreur inattendue.'),
          error: !res.ok,
          loading: false,
          programs: loboc ? res.programs : undefined,
          memory: loboc ? res.memory : undefined,
          feedback: loboc && res.ok && res.feedback ? res.feedback : undefined,
          pending,
          pendingState: pending ? 'active' : undefined,
        }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', text: t('server_unreachable'), loading: false, error: true }
        return updated
      })
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  // Forget the active announcement once its token expires (10 minutes).
  const activeIndex = messages.findIndex(m => m.pendingState === 'active')
  const activeExpires = activeIndex >= 0 ? messages[activeIndex].pending?.expires ?? 0 : 0
  useEffect(() => {
    if (activeIndex < 0 || !activeExpires) return
    const delay = Math.max(0, activeExpires * 1000 - Date.now())
    const timer = setTimeout(() => {
      setMessages(prev => prev.map((m, i) =>
        i === activeIndex && m.pendingState === 'active' ? { ...m, pendingState: 'expired' } : m,
      ))
    }, delay)
    return () => clearTimeout(timer)
  }, [activeIndex, activeExpires])

  function setPendingState(index: number, state: PendingState) {
    setMessages(prev => prev.map((m, i) => (i === index ? { ...m, pendingState: state } : m)))
  }

  async function rateAnswer(index: number, note: number) {
    const msg = messages[index]
    // The token lasts 24 h; past that, api_run answers INVALID_FEEDBACK, shown as an error.
    if (!msg?.feedback || msg.noteState === 'sending') return
    const previous = msg.note
    setMessages(prev => prev.map((m, i) => (i === index ? { ...m, note, noteState: 'sending' } : m)))
    let ok = false
    try {
      const res = await nqlFeedback(host, user, pass, idToken, base, msg.feedback, note)
      ok = res.ok && res.status === 'noted'
    } catch {
      ok = false
    }
    // Re-rating is allowed: the last note counts. On failure, keep the previous note.
    setMessages(prev => prev.map((m, i) =>
      i === index ? { ...m, note: ok ? note : previous, noteState: ok ? undefined : 'error' } : m,
    ))
  }

  function cancelPending(index: number) {
    // Nothing was saved: just forget the announcement client-side.
    setPendingState(index, 'cancelled')
    inputRef.current?.focus()
  }

  async function confirmPending(index: number) {
    const msg = messages[index]
    const pending = msg?.pending
    if (!pending || msg.pendingState !== 'active' || busy) return
    if (isExpired(pending)) {
      setPendingState(index, 'expired')
      return
    }
    setBusy(true)
    setMessages(prev => [
      ...prev.map((m, i) => (i === index ? { ...m, pendingState: 'confirming' as const } : m)),
      { role: 'assistant', text: '', loading: true },
    ])
    try {
      const res = await nqlConfirm(host, user, pass, idToken, base, pending)
      const next: PendingState =
        !res.ok ? 'active'
        : res.status === 'success' ? 'confirmed'
        : res.status === 'announce' ? 'replaced'
        : 'failed'
      const newPending = res.ok && res.status === 'announce' && res.pending ? res.pending : undefined
      setMessages(prev => {
        let updated = prev.map((m, i) => (i === index ? { ...m, pendingState: next } : m))
        if (newPending) updated = supersedePending(updated)
        updated[updated.length - 1] = {
          role: 'assistant',
          text: confirmationText(res),
          error: !res.ok,
          loading: false,
          pending: newPending,
          pendingState: newPending ? 'active' : undefined,
        }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = prev.map((m, i) => (i === index ? { ...m, pendingState: 'active' as const } : m))
        updated[updated.length - 1] = { role: 'assistant', text: t('server_unreachable'), loading: false, error: true }
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

  function handleSaveKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') confirmSave()
    if (e.key === 'Escape') { setShowSaveInput(false); setSavingName('') }
  }

  const suggestions = [t('suggestion_1'), t('suggestion_2'), t('suggestion_3')]

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0a0a0f' }}>

      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #1e1e2e', background: '#0d0d14' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-white tracking-tight">APIBASE</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(139,92,246,0.2)',
              color: '#a78bfa',
              border: '1px solid rgba(139,92,246,0.4)',
            }}
          >
            NQL
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
            <span className="font-mono" style={{ color: '#64748b' }}>{host}</span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span className="font-mono px-2 py-0.5 rounded" style={{ background: '#1e1e2e', color: '#a78bfa' }}>
              {base}
            </span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span className="font-mono" style={{ color: '#94a3b8' }}>{user}</span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span>token #{idToken}</span>
          </div>

          <div
            className="flex items-center text-xs rounded-lg overflow-hidden"
            style={{ border: '1px solid #1e1e2e' }}
            title={t('mode_hint')}
          >
            <span className="px-2" style={{ color: '#475569' }}>{t('mode_label')}</span>
            {(['auto', 'tools', 'loboc'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-2 py-1.5"
                style={{
                  background: mode === m ? 'rgba(139,92,246,0.2)' : 'none',
                  color: mode === m ? '#a78bfa' : '#475569',
                  border: 'none',
                  borderLeft: '1px solid #1e1e2e',
                  cursor: 'pointer',
                }}
              >
                {m === 'auto' ? t('mode_auto') : m === 'tools' ? 'tools' : 'LOBOC'}
              </button>
            ))}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'none', color: '#475569', border: '1px solid #1e1e2e', cursor: 'pointer' }}
            >
              {t('clear')}
            </button>
          )}

          <button
            onClick={openDisplay}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: '#1e1e2e', color: '#94a3b8', border: '1px solid #2d2d3e', cursor: 'pointer' }}
          >
            ⎋ Plasma
          </button>

          <button
            onClick={logout}
            className="text-xs"
            style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t('sign_out')}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-6 space-y-6 w-full px-2">
        {messages.length === 0 && (
          <div className="text-center pt-16">
            <p className="text-4xl mb-4">✦</p>
            <p className="font-semibold text-white text-lg mb-1">{t('ask_title')}</p>
            <p className="text-sm mb-6" style={{ color: '#475569' }}>
              {t('ask_subtitle')} <span className="font-mono" style={{ color: '#64748b' }}>{base}</span>.
            </p>
            <div className="space-y-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full text-left text-sm px-4 py-3 rounded-xl transition-all"
                  style={{ background: '#12121a', color: '#64748b', border: '1px solid #1e1e2e', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#64748b' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div
                className="max-w-xl px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}
              >
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
                    {msg.text && <ResultRenderer text={msg.text} />}
                    {msg.pending && msg.pendingState && (
                      <PendingBlock
                        pending={msg.pending}
                        state={msg.pendingState}
                        busy={busy}
                        onConfirm={() => confirmPending(i)}
                        onCancel={() => cancelPending(i)}
                      />
                    )}
                    {msg.feedback && (
                      <RatingBar
                        note={msg.note}
                        state={msg.noteState}
                        onRate={n => rateAnswer(i, n)}
                      />
                    )}
                    {((msg.programs?.length ?? 0) > 0 || (msg.memory?.length ?? 0) > 0) && (
                      <ProgramsBlock programs={msg.programs ?? []} memory={msg.memory ?? []} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="pb-6 w-full px-2">

        {/* Saved queries panel */}
        {showSaved && savedQueries.length > 0 && (
          <div
            className="mb-2 rounded-xl overflow-hidden"
            style={{ background: '#0d0d14', border: '1px solid #1e1e2e' }}
          >
            {savedQueries.map(q => (
              <div
                key={q.id}
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderBottom: '1px solid #1a1a2e' }}
              >
                <button
                  onClick={() => restoreQuery(q)}
                  className="flex-1 text-left text-xs truncate"
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                  title={q.query}
                >
                  <span style={{ color: '#a78bfa', marginRight: '8px' }}>⊞</span>
                  {q.name}
                </button>
                <button
                  onClick={() => deleteSaved(q.id)}
                  className="text-xs flex-shrink-0"
                  style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#334155' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Save name input */}
        {showSaveInput && (
          <div
            className="mb-2 flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: '#0d0d14', border: '1px solid #7c3aed' }}
          >
            <span style={{ color: '#a78bfa', fontSize: '0.75rem' }}>⊞</span>
            <input
              ref={saveNameRef}
              value={savingName}
              onChange={e => setSavingName(e.target.value)}
              onKeyDown={handleSaveKey}
              placeholder={t('save_name_placeholder')}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: '#e2e8f0' }}
            />
            <button
              onClick={confirmSave}
              disabled={!savingName.trim()}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: savingName.trim() ? '#7c3aed' : 'transparent',
                color: savingName.trim() ? '#fff' : '#334155',
                border: 'none',
                cursor: savingName.trim() ? 'pointer' : 'default',
              }}
            >
              ✓
            </button>
            <button
              onClick={() => { setShowSaveInput(false); setSavingName('') }}
              className="text-xs"
              style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Toolbar: saved toggle */}
        {savedQueries.length > 0 && (
          <div className="flex items-center mb-1 px-1">
            <button
              onClick={() => setShowSaved(v => !v)}
              className="text-xs"
              style={{ color: showSaved ? '#a78bfa' : '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showSaved ? '▲' : '▼'} {t('saved')} ({savedQueries.length})
            </button>
          </div>
        )}

        {/* Input box */}
        <div
          className="flex items-end gap-3 px-4 py-3 rounded-2xl"
          style={{ background: '#12121a', border: '1px solid #1e1e2e' }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t('ask_placeholder')}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ color: '#e2e8f0', maxHeight: '120px' }}
          />

          {input.trim() && !busy && !showSaveInput && (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              title={t('save_query')}
              style={{ background: 'none', border: '1px solid #1e1e2e', color: '#475569', cursor: 'pointer', fontSize: '1rem' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#475569' }}
            >
              ⊞
            </button>
          )}

          <button
            onClick={sendQuery}
            disabled={!input.trim() || busy}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !busy ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(109,40,217,0.25)',
              color: input.trim() && !busy ? '#fff' : '#7c3aed',
              border: 'none',
              cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
            }}
          >
            ↑
          </button>
        </div>

        <p className="text-center text-xs mt-2" style={{ color: '#1e293b' }}>
          {t('enter_hint')}
        </p>
      </div>
    </div>
  )
}

function PendingBlock({ pending, state, busy, onConfirm, onCancel }: {
  pending: NQLPending
  state: PendingState
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const live = state === 'active' || state === 'confirming'
  const note: Partial<Record<PendingState, string>> = {
    confirmed: t('pending_done'),
    cancelled: t('pending_cancelled'),
    replaced: t('pending_replaced'),
    expired: t('pending_expired'),
    failed: t('confirm_error'),
  }
  const th = 'px-3 py-1.5 font-medium'
  const td = 'px-3 py-1.5 font-mono'

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden text-xs"
      style={{ border: `1px solid ${live ? '#7c3aed' : '#1e1e2e'}`, opacity: live ? 1 : 0.6 }}
    >
      <div className="px-3 py-2 font-semibold" style={{ background: '#0d0d14', color: '#a78bfa' }}>
        {t('pending_title')}
      </div>
      <table className="w-full" style={{ color: '#cbd5e1' }}>
        <thead style={{ color: '#64748b' }}>
          <tr>
            <th className={`${th} text-left`}>{t('col_table')}</th>
            <th className={`${th} text-right`}>{t('col_added')}</th>
            <th className={`${th} text-right`}>{t('col_modified')}</th>
            <th className={`${th} text-right`}>{t('col_removed')}</th>
          </tr>
        </thead>
        <tbody>
          {pending.changes.map(c => (
            <tr key={`${c.base ?? ''}:${c.T}`} style={{ borderTop: '1px solid #1a1a2e' }}>
              <td className={td}>
                {c.base && <span style={{ color: '#a78bfa' }}>{c.base}.</span>}
                {c.table}
              </td>
              <td className={`${td} text-right`} style={{ color: c.added ? '#4ade80' : undefined }}>{c.added}</td>
              <td className={`${td} text-right`} style={{ color: c.modified ? '#fbbf24' : undefined }}>{c.modified}</td>
              <td className={`${td} text-right`} style={{ color: c.removed ? '#f87171' : undefined }}>{c.removed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#0d0d14', borderTop: '1px solid #1a1a2e' }}>
        {live ? (
          <>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg font-semibold"
              style={{
                background: busy ? 'rgba(109,40,217,0.25)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {state === 'confirming' ? t('confirming') : t('confirm')}
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg"
              style={{ background: 'none', color: '#94a3b8', border: '1px solid #2d2d3e', cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              {t('cancel')}
            </button>
          </>
        ) : (
          <span style={{ color: '#64748b' }}>{note[state]}</span>
        )}
      </div>
    </div>
  )
}

const NOTE_HINT: Record<number, 'note_good' | 'note_ok' | 'note_bad'> = {
  5: 'note_good', 4: 'note_good', 3: 'note_ok', 2: 'note_bad', 1: 'note_bad',
}

function RatingBar({ note, state, onRate }: {
  note?: number
  state?: 'sending' | 'error'
  onRate: (n: number) => void
}) {
  return (
    <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: '#475569' }}>
      <span className="mr-1">{t('rate_label')}</span>
      {[1, 2, 3, 4, 5].map(n => {
        const on = note === n
        return (
          <button
            key={n}
            onClick={() => onRate(n)}
            disabled={state === 'sending'}
            title={`${n} — ${t(NOTE_HINT[n])}`}
            className="w-6 h-6 rounded-md font-mono"
            style={{
              background: on ? 'rgba(139,92,246,0.25)' : 'none',
              color: on ? '#a78bfa' : '#64748b',
              border: `1px solid ${on ? '#7c3aed' : '#1e1e2e'}`,
              cursor: state === 'sending' ? 'wait' : 'pointer',
            }}
          >
            {n}
          </button>
        )
      })}
      <span className="ml-2">
        {state === 'sending' ? '…'
          : state === 'error' ? <span style={{ color: '#f87171' }}>{t('rate_error')}</span>
          : note ? `✓ ${t('rate_done')}` : ''}
      </span>
    </div>
  )
}

function ProgramsBlock({ programs, memory }: { programs: NQLProgram[]; memory: NQLMemory[] }) {
  const color: Record<string, string> = { success: '#4ade80', announce: '#a78bfa', error: '#f87171', advice: '#38bdf8' }
  return (
    <details className="mt-3 text-xs" style={{ color: '#475569' }}>
      <summary style={{ cursor: 'pointer' }}>
        {t('programs_label')} ({programs.length}){memory.length > 0 ? ` · ${t('memory_label')} (${memory.length})` : ''}
      </summary>
      <div className="mt-2 space-y-2">
        {memory.length > 0 && (
          <div className="rounded-lg px-3 py-2" style={{ background: '#0d0d14', border: '1px solid #1a1a2e' }}>
            <div className="mb-1" style={{ color: '#38bdf8' }}>{t('memory_title')}</div>
            {memory.map((m, i) => (
              <div key={i} style={{ color: '#94a3b8' }}>
                « {m.question} » · {t('memory_note')} {m.note}
                {' · '}{m.same ? t('memory_same') : t('memory_similar')}
                {m.by ? ` · ${m.by}` : ''}
              </div>
            ))}
          </div>
        )}
        {programs.map((p, i) => (
          <div key={i} className="rounded-lg px-3 py-2" style={{ background: '#0d0d14', border: '1px solid #1a1a2e' }}>
            <div className="mb-1" style={{ color: color[p.status] ?? '#94a3b8' }}>
              {p.status === 'advice' ? (p.by ?? t('advisor_default')) : p.status}
              {p.code ? ` · ${p.code}` : ''}{p.message ? ` — ${p.message}` : ''}
            </div>
            <pre className="whitespace-pre-wrap font-mono" style={{ color: '#94a3b8' }}>{p.program}</pre>
          </div>
        ))}
      </div>
    </details>
  )
}
