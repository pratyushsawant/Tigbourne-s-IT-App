// Thin API client. When VITE_API_BASE is unset, the app runs fully on bundled data +
// mock auth (the demo/offline mode), so nothing breaks without a backend.
const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || ''
export const API_BASE = BASE
export const apiEnabled = !!BASE

const TOKEN_KEY = 'tigbourne.token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

/** GET → parsed JSON, or null on any failure (caller falls back). */
export async function apiGet<T>(path: string): Promise<T | null> {
  if (!BASE) return null
  try {
    const res = await fetch(BASE + path, { headers: authHeaders() })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
}

/** POST → { ok, status, data }. status 0 means the backend was unreachable. */
export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  if (!BASE) return { ok: false, status: 0, data: null }
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: authHeaders(true),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    let data: T | null = null
    if (res.headers.get('content-type')?.includes('json')) {
      data = (await res.json().catch(() => null)) as T | null
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export async function apiDelete(path: string): Promise<boolean> {
  if (!BASE) return false
  try {
    const res = await fetch(BASE + path, { method: 'DELETE', headers: authHeaders() })
    return res.ok
  } catch {
    return false
  }
}
