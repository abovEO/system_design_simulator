import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_API_BASE_URL', 'undefined'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
let moduleId = 0
async function setup(responses, saved = null) {
  const storage = new Map(saved ? [['system-design-session', JSON.stringify(saved)]] : [])
  globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    const next = responses.shift()
    if (next instanceof Error) throw next
    assert.ok(next, 'Unexpected API request')
    return new Response(JSON.stringify(next.body), { status: next.status || 200 })
  }
  const auth = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${moduleId++}`)
  return { auth, calls, storage }
}

test('sign-in loads a protected profile and sign-out clears tokens', async () => {
  const { auth, calls, storage } = await setup([{ body: { access: 'a', refresh: 'r' } }, { body: { username: 'ada', email: 'ada@example.com' } }])
  assert.equal((await auth.signIn('ada', 'password')).username, 'ada')
  assert.deepEqual(JSON.parse(calls[0].body), { username: 'ada', password: 'password' })
  assert.equal(calls[1].headers.Authorization, 'Bearer a')
  assert.equal(storage.size, 1)
  auth.signOut()
  assert.equal(auth.hasSession(), false)
  assert.equal(storage.size, 0)
})
test('expired access tokens refresh and retry the profile', async () => {
  const { auth, calls } = await setup([{ status: 401, body: { detail: 'Expired' } }, { body: { access: 'new' } }, { body: { username: 'ada' } }], { access: 'old', refresh: 'r' })
  assert.equal((await auth.getProfile()).username, 'ada')
  assert.equal(calls[1].url, '/api/auth/refresh/')
  assert.equal(calls[2].headers.Authorization, 'Bearer new')
})
test('rejected refresh clears the saved session', async () => {
  const { auth, storage } = await setup([{ status: 401, body: {} }, { status: 401, body: { detail: 'Expired' } }], { access: 'old', refresh: 'old' })
  await assert.rejects(auth.getProfile(), /Expired/)
  assert.equal(storage.size, 0)
})
test('registration surfaces field validation errors', async () => {
  const { auth } = await setup([{ status: 400, body: { username: ['A user with that username already exists.'] } }])
  await assert.rejects(auth.register('ada', 'ada@example.com', 'password'), /username: A user/)
})
test('registration sends first and last name', async () => {
  const { auth, calls } = await setup([{ status: 201, body: { username: 'ada' } }])
  await auth.register('ada', 'ada@example.com', 'Ada', 'Lovelace', 'password')
  assert.deepEqual(JSON.parse(calls[0].body), { username: 'ada', email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace', password: 'password' })
})
test('network failures preserve an existing session for retry', async () => {
  const { auth, storage } = await setup([new TypeError('Failed to fetch')], { access: 'a', refresh: 'r' })
  await assert.rejects(auth.getProfile(), /Unable to reach the server/)
  assert.equal(storage.size, 1)
})
