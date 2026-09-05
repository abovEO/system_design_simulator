import { useEffect, useState, type FormEvent } from 'react'
import { AuthError, getProfile, hasSession, register, signIn, signOut, type Profile } from './auth'
import './App.css'

function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restoring, setRestoring] = useState(hasSession)
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    if (hasSession()) getProfile().then(user => { if (active) setProfile(user) }).catch(err => {
      if (active) setError(err instanceof AuthError && err.status === 401 ? 'Your session has expired. Please sign in again.' : err.message)
    }).finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const username = String(data.get('username')).trim()
    const password = String(data.get('password'))
    setError(''); setNotice('')
    if (!username) { setError('Please enter a username.'); return }
    if (mode === 'register' && password !== data.get('confirm')) { setError('Your passwords don’t match. Please try again.'); return }
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(username, String(data.get('email')).trim(), password)
        setMode('login'); setVisible(false); form.reset()
        setNotice('Your account is ready. Sign in to continue.')
      } else {
        setProfile(await signIn(username, password)); form.reset()
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="app-shell">
      <aside className="story-panel">
        <a className="brand" href="/" aria-label="System Design Simulator home"><span className="brand-mark" aria-hidden="true">⌘</span> System Design <span className="brand-light">Simulator</span></a>
        <div className="story-content">
          <span className="eyebrow">THINK IN SYSTEMS</span>
          <h1>Big ideas.<br />Better architecture.</h1>
          <p>A space to explore trade-offs, connect the pieces, and build your system design intuition.</p>
          <div className="architecture" aria-hidden="true">
            <div className="diagram-top"><span className="node">↗ &nbsp; Client</span><span className="connector" /><span className="node accent-node">⇄ &nbsp; Load balancer</span></div>
            <div className="diagram-branch" />
            <div className="diagram-bottom"><span className="node">▤ &nbsp; Service A</span><span className="node">▤ &nbsp; Service B</span><span className="node">▤ &nbsp; Service C</span></div>
            <div className="diagram-caption"><span /> A little structure. A lot of possibility.</div>
          </div>
        </div>
        <div className="story-footer">A good system starts with a good foundation.</div>
      </aside>
      <main className="form-panel">
        <span className="section-label">YOUR NEXT CHAPTER STARTS HERE</span>
        <div className="auth-card">
          {restoring ? <div role="status"><span className="eyebrow">ONE MOMENT</span><h2>Getting things ready…</h2><p className="subtitle">Restoring your session.</p></div> : profile ? (
            <section>
              <span className="success-icon" aria-hidden="true">✓</span>
              <span className="eyebrow">YOU’RE SIGNED IN</span>
              <h2>Welcome, {profile.username}.</h2>
              <p className="subtitle">Your account is ready for the next big idea.</p>
              <dl className="profile-details"><dt>Username</dt><dd>{profile.username}</dd><dt>Email address</dt><dd>{profile.email || 'Not provided'}</dd></dl>
              <button className="primary-button" onClick={() => { signOut(); setProfile(null); setError(''); setNotice('You have been signed out.'); setVisible(false) }}>Sign out <span aria-hidden="true">↗</span></button>
            </section>
          ) : (
            <>
              <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'LET’S GET STARTED'}</span>
              <h2>{mode === 'login' ? 'Pick up where you left off.' : 'Build your foundation.'}</h2>
              <p className="subtitle">{mode === 'login' ? 'Sign in to your System Design Simulator account.' : 'Create an account and start thinking at scale.'}</p>
              <div className="mode-switch" aria-label="Authentication options">
                <button disabled={busy} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); setNotice(''); setVisible(false) }}>Sign in</button>
                <button disabled={busy} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); setNotice(''); setVisible(false) }}>Create account</button>
              </div>
              {error && <div className="message error" role="alert">{error}</div>}
              {notice && <div className="message success" role="status">{notice}</div>}
              <form key={mode} onSubmit={submit}>
                <fieldset disabled={busy}>
                  <label htmlFor="username">Username</label>
                  <input id="username" name="username" autoComplete="username" placeholder="Your username" maxLength={150} required />
                  {mode === 'register' && <><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></>}
                  <label htmlFor="password">Password</label>
                  <div className="password-field"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Enter your password" required /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button></div>
                  {mode === 'register' && <><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" required /></>}
                  <button className="primary-button" type="submit">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">→</span></button>
                </fieldset>
              </form>
              <p className="form-note">Your next great design starts with a single connection.</p>
            </>
          )}
        </div>
        <footer>DESIGN. REASON. REFINE.</footer>
      </main>
    </div>
  )
}
export default App
