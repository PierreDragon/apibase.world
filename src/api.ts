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

export interface NQLResult {
  ok: boolean
  answer?: string
  tools?: NQLToolCall[]
  plan?: NQLToolCall[]
  context?: NQLContext
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
  context: NQLContext = null,
): Promise<NQLResult> {
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

  const res = await fetch(`${RELAY}/nql.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (data.tools && !data.plan) {
    data.plan = data.tools
  }

  if (data.plan && !data.tools) {
    data.tools = data.plan
  }

  return data
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