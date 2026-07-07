import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// Minimal mock — App.tsx and api.ts only need currentUser and onAuthStateChanged.
// In demo mode we never call any real Firebase method.
const demoAuth = {
  currentUser: { uid: 'demo-user', email: 'demo@example.com', getIdToken: async () => 'demo-token' },
  onAuthStateChanged: (_observer: unknown) => () => {},
} as unknown as ReturnType<typeof getAuth>

function getRealAuth() {
  if (getApps().length === 0) {
    initializeApp({
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    })
  }
  return getAuth()
}

export const auth = DEMO ? demoAuth : getRealAuth()
