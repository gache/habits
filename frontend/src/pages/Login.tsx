import { useState } from 'react'
import { Plant } from '@phosphor-icons/react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (err: any) {
      setError(err?.message ?? 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-cream-200 rounded-lg px-3.5 py-2.5 text-sm bg-cream-100 dark:bg-cream-800 text-cream-800 dark:text-cream-100 placeholder-cream-300 dark:placeholder-cream-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus:border-amber-300 transition-colors font-sans'

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-cream-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-cream-50 dark:bg-cream-800 border border-cream-200 dark:border-cream-700 rounded-2xl shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-cream-100 dark:bg-cream-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Plant size={28} weight="fill" className="text-sage-600" aria-hidden="true" />
            </div>
            <h1 className="font-serif font-700 text-xl text-cream-800 dark:text-cream-100">
              Habit Tracker
            </h1>
            <p className="font-handwritten text-cream-400 dark:text-cream-500 text-base mt-1">
              Small habits, big changes. ♥
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-lg overflow-hidden border border-cream-200 dark:border-cream-700 mb-5 p-0.5 bg-cream-100 dark:bg-cream-700 gap-0.5">
            {(['Sign In', 'Sign Up'] as const).map((label, idx) => (
              <button
                key={label}
                onClick={() => setIsSignUp(idx === 1)}
                className={[
                  'flex-1 py-1.5 text-sm font-600 rounded-md transition-colors',
                  isSignUp === (idx === 1)
                    ? 'bg-cream-50 dark:bg-cream-800 text-cream-800 dark:text-cream-100 shadow-xs'
                    : 'text-cream-500 dark:text-cream-400 hover:text-cream-700 dark:hover:text-cream-200',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-red-600 text-xs mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-600 uppercase tracking-widest text-cream-400 mb-1.5 font-sans">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] font-600 uppercase tracking-widest text-cream-400 mb-1.5 font-sans">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-cream-800 dark:bg-cream-100 text-cream-50 dark:text-cream-900 rounded-lg py-2.5 text-sm font-700 hover:bg-cream-700 dark:hover:bg-cream-200 disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              {loading ? '…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-cream-200 dark:bg-cream-700" />
            <span className="text-xs text-cream-300 dark:text-cream-600 font-sans">or</span>
            <div className="flex-1 h-px bg-cream-200 dark:bg-cream-700" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full border border-cream-200 dark:border-cream-700 rounded-lg py-2.5 text-sm font-600 text-cream-700 dark:text-cream-200 hover:bg-cream-100 dark:hover:bg-cream-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
