import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Login from '@/pages/Login'
import Tracker from '@/pages/Tracker'
import History from '@/pages/History'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'
const DEMO_USER = { uid: 'demo-user', email: 'demo@example.com' } as User

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(
    DEMO ? DEMO_USER : undefined,
  )

  useEffect(() => {
    if (DEMO) return
    return onAuthStateChanged(auth, setUser)
  }, [])

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <p className="font-handwritten text-cream-400 text-xl">Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {user ? (
          <>
            <Route path="/" element={<Tracker />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="*" element={<Login />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
