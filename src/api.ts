const RELAY = '/api'

export interface TokenInfo {
  id_token: number
  label: string
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

export interface NQLResult {
  ok: boolean
  answer?: string
  plan?: { tool: string; input: Record<string, unknown> }[]
  error?: string
}

export async function authenticate(host: string, username: string, password: string): Promise<AuthResult> {
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
): Promise<NQLResult> {
  const res = await fetch(`${RELAY}/nql.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, username, password, id_token: idToken, base, prompt }),
  })
  return res.json()
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
  if (!res.ok) return null
  return res.json()
}
