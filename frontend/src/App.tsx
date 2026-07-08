import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const Login = lazy(() => import('@/pages/Login'))
const Tracker = lazy(() => import('@/pages/Tracker'))
const History = lazy(() => import('@/pages/History'))

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'
const DEMO_USER = { uid: 'demo-user', email: 'demo@example.com' } as User

function PageLoading() {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center">
      <p className="font-handwritten text-cream-400 text-xl">Cargando...</p>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(
    DEMO ? DEMO_USER : undefined,
  )

  useEffect(() => {
    if (DEMO) return
    return onAuthStateChanged(auth, setUser)
  }, [])

  if (user === undefined) {
    return <PageLoading />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
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
      </Suspense>
    </BrowserRouter>
  )
}
