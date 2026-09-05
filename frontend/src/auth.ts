export type Profile = { username: string; email: string; first_name: string; last_name: string }
type Tokens = { access: string; refresh: string }
const storageKey = 'system-design-session'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/auth').replace(/\/$/, '')
let tokens: Tokens | null = null
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
  if (typeof saved?.access === 'string' && typeof saved?.refresh === 'string') tokens = saved
} catch { /* Storage can be unavailable; keep the session in memory. */ }

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function request<T>(path: string, body?: object, access?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/${path}/`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(access ? { Authorization: `Bearer ${access}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    })
  } catch { throw new Error('Unable to reach the server. Please try again.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? Object.entries(data).map(([key, value]) => `${key === 'detail' || key === 'non_field_errors' ? '' : `${key}: `}${Array.isArray(value) ? value.join(' ') : value}`).join(' ')
      : 'Something went wrong. Please try again.'
    throw new AuthError(message, response.status)
  }
  return data as T
}
function save(next: Tokens | null) {
  tokens = next
  try {
    if (next) sessionStorage.setItem(storageKey, JSON.stringify(next))
    else sessionStorage.removeItem(storageKey)
  } catch { /* Fall back to an in-memory session. */ }
}
export const signOut = () => save(null)
export const hasSession = () => tokens !== null
export const register = (username: string, email: string, firstName: string, lastName: string, password: string) =>
  request('register', { username, email, first_name: firstName, last_name: lastName, password })
export async function signIn(username: string, password: string) {
  save(await request<Tokens>('login', { username, password }))
  return getProfile()
}
export async function getProfile(): Promise<Profile> {
  if (!tokens) throw new AuthError('Please sign in to continue.', 401)
  try { return await request<Profile>('profile', undefined, tokens.access) }
  catch (error) {
    if (!(error instanceof AuthError) || error.status !== 401) throw error
    try {
      const refreshed = await request<{ access: string; refresh?: string }>('refresh', { refresh: tokens.refresh })
      save({ access: refreshed.access, refresh: refreshed.refresh || tokens.refresh })
      return await request<Profile>('profile', undefined, refreshed.access)
    } catch (refreshError) {
      if (refreshError instanceof AuthError && refreshError.status === 401) signOut()
      throw refreshError
    }
  }
}
