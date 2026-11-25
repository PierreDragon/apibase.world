const RELAY = '/api'

export interface TokenInfo {
  id_token: number
  label: string
  rqt: number
  bases: string[]
}

export interface AuthResult {
  ok: boolean
  id_user?: number
  username?: string
  lang?: string
  tokens?: TokenInfo[]
  error?: string
}

export type NQLContext = Record<string, unknown> | null

export interface NQLToolCall {
  tool: string
  input: Record<string, unknown>
}

export interface NQLChange {
  T: number
  table: string
  // Present only when the write targets another base than the current one.
  base?: string
  added: number
  modified: number
  removed: number
}

export interface NQLPending {
  program: string
  token: string
  changes: NQLChange[]
  expires: number
}

export interface NQLProgram {
  program: string
  status: 'success' | 'announce' | 'error'
  code?: string
  message?: string
}

export interface NQLConfirm {
  program: string
  token: string
}

// Mode sent per call. Omitted: the installation setting (configs.nqlmode) applies.
export type NQLMode = 'loboc' | 'tools'

export interface NQLResult {
  ok: boolean
  // Mode actually used for this answer; the display is based on it.
  mode?: NQLMode
  answer?: string
  // tools mode
  tools?: NQLToolCall[]
  plan?: NQLToolCall[]
  context?: NQLContext
  // LOBOC mode
  programs?: NQLProgram[]
  pending?: NQLPending | null
  // LOBOC confirmation
  status?: 'success' | 'announce' | 'error'
  code?: string
  message?: string
  changes?: NQLChange[]
  error?: string
}

export async function authenticate(
  host: string,
  username: string,
  password: string,
): Promise<AuthResult> {
  const res = await fetch(`${RELAY}/connect.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, username, password }),
  })

  return res.json()
}

export async function nqlQuery(
  host: string,
  username: string,
  password: string,
  idToken: number,
  base: string,
  prompt: string,
  options: { context?: NQLContext; confirm?: NQLConfirm | null; mode?: NQLMode | null } = {},
): Promise<NQLResult> {
  const { context = null, confirm = null, mode = null } = options
  const payload: Record<string, unknown> = {
    host,
    username,
    password,
    id_token: idToken,
    base,
    prompt,
  }

  if (context) {
    payload.context = context
  }

  if (confirm) {
    // Sent back exactly as received: the token is signed and bound to the program.
    payload.confirm = { program: confirm.program, token: confirm.token }
  }

  if (mode) {
    payload.mode = mode
  }

  const res = await fetch(`${RELAY}/nql.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data: NQLResult = await res.json()

  if (data.tools && !data.plan) {
    data.plan = data.tools
  }

  if (data.plan && !data.tools) {
    data.tools = data.plan
  }

  return data
}

export function nqlConfirm(
  host: string,
  username: string,
  password: string,
  idToken: number,
  base: string,
  pending: NQLPending,
): Promise<NQLResult> {
  // prompt is required by api_run but unused for a confirmation (no Claude call).
  // A call with confirm is always a LOBOC confirmation; mode is sent for consistency only.
  return nqlQuery(host, username, password, idToken, base, 'confirm', {
    confirm: { program: pending.program, token: pending.token },
    mode: 'loboc',
  })
}

export async function pushToDisplay(sid: string, payload: unknown): Promise<void> {
  await fetch(`${RELAY}/push.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, payload }),
  })
}

export async function pollDisplay(sid: string): Promise<unknown> {
  const res = await fetch(`${RELAY}/poll.php?sid=${encodeURIComponent(sid)}`)

  if (!res.ok) {
    return null
  }

  return res.json()
}