import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticate, type TokenInfo } from '../api'
import { t } from '../i18n'

type Step = 'credentials' | 'token'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('credentials')
  const [host, setHost] = useState('apibase.work')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)
  const [selectedBase, setSelectedBase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCredentials(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authenticate(host.trim(), username.trim(), password)
      if (res.ok && res.tokens) {
        sessionStorage.setItem('nql_lang', res.lang ?? 'en')
        setTokens(res.tokens)
        setStep('token')
        if (res.tokens.length === 1) {
          setSelectedToken(res.tokens[0])
          if (res.tokens[0].bases.length === 1) {
            setSelectedBase(res.tokens[0].bases[0])
          }
        }
      } else {
        setError(res.error ?? t('auth_failed'))
      }
    } catch {
      setError(t('server_unreachable'))
    } finally {
      setLoading(false)
    }
  }

  function handleTokenSelect(e: FormEvent) {
    e.preventDefault()
    if (!selectedToken || !selectedBase) return
    sessionStorage.setItem('nql_host', host.trim())
    sessionStorage.setItem('nql_user', username.trim())
    sessionStorage.setItem('nql_pass', password)
    sessionStorage.setItem('nql_id_token', String(selectedToken.id_token))
    sessionStorage.setItem('nql_base', selectedBase)
    navigate('/nql')
  }

  const inputStyle = {
    background: '#0a0a0f',
    border: '1px solid #1e1e2e',
    color: '#e2e8f0',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold tracking-tight text-white">APIBASE</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)' }}>
              NQL
            </span>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {step === 'credentials' ? t('signin_subtitle') : t('token_subtitle')}
          </p>
        </div>

        {/* Step 1 — Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentials}
            className="rounded-2xl p-8 space-y-5"
            style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>

            <Field label={t('field_host')}>
              <input
                type="text"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="apibase.work"
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none font-mono transition-all"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
              />
              <p className="text-xs mt-1" style={{ color: '#334155' }}>
                ex. apibase.work · acme.apibase.world · monserveur.com
              </p>
            </Field>

            <Field label={t('field_username')}>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="jean.tremblay"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
              />
            </Field>

            <Field label={t('field_password')}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#7c3aed')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
              />
            </Field>

            {error && <ErrorBox>{error}</ErrorBox>}

            <SubmitButton loading={loading} disabled={!host || !username || !password}>
              {loading ? t('signing_in') : t('continue')}
            </SubmitButton>
          </form>
        )}

        {/* Step 2 — Token selector */}
        {step === 'token' && (
          <form onSubmit={handleTokenSelect}
            className="rounded-2xl p-8 space-y-5"
            style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>

            <Field label="Token">
              <div className="space-y-2">
                {tokens.map(tok => (
                  <button
                    key={tok.id_token}
                    type="button"
                    onClick={() => {
                      setSelectedToken(tok)
                      setSelectedBase(tok.bases.length === 1 ? tok.bases[0] : '')
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all"
                    style={{
                      background: selectedToken?.id_token === tok.id_token ? 'rgba(124,58,237,0.15)' : '#0a0a0f',
                      border: `1px solid ${selectedToken?.id_token === tok.id_token ? '#7c3aed' : '#1e1e2e'}`,
                      color: tok.rqt === 0 ? '#475569' : '#e2e8f0',
                      opacity: tok.rqt === 0 ? 0.6 : 1,
                    }}>
                    <span className="font-mono text-xs mr-2" style={{ color: '#64748b' }}>#{tok.id_token}</span>
                    {tok.label || t('unlabelled_token')}
                    <span className="ml-2 text-xs" style={{ color: '#475569' }}>
                      ({tok.bases.length} base{tok.bases.length > 1 ? 's' : ''})
                    </span>
                    {tok.rqt === 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                        épuisé
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Field>

            {selectedToken && selectedToken.bases.length > 0 && (
              <Field label="Base">
                <div className="space-y-2">
                  {selectedToken.bases.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBase(b)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-mono transition-all"
                      style={{
                        background: selectedBase === b ? 'rgba(124,58,237,0.15)' : '#0a0a0f',
                        border: `1px solid ${selectedBase === b ? '#7c3aed' : '#1e1e2e'}`,
                        color: '#e2e8f0',
                      }}>
                      {b}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {error && <ErrorBox>{error}</ErrorBox>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('credentials')}
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#1e1e2e', color: '#64748b', border: 'none', cursor: 'pointer' }}>
                {t('back')}
              </button>
              <SubmitButton loading={false} disabled={!selectedToken || !selectedBase} className="flex-1">
                {t('open_nql')}
              </SubmitButton>
            </div>
          </form>
        )}

        <p className="text-center text-xs mt-6" style={{ color: '#1e293b' }}>apibase.world</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm px-3 py-2 rounded-lg"
      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
      {children}
    </p>
  )
}

function SubmitButton({ loading, disabled, children, className = '' }: {
  loading: boolean; disabled: boolean; children: React.ReactNode; className?: string
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`py-3 rounded-lg font-semibold text-sm transition-all w-full ${className}`}
      style={{
        background: !disabled && !loading ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#1e1e2e',
        color: !disabled && !loading ? '#fff' : '#64748b',
        cursor: !disabled && !loading ? 'pointer' : 'not-allowed',
        border: 'none',
      }}>
      {children}
    </button>
  )
}
