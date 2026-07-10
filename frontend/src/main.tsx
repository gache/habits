import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Completion history (used for streaks) spans up to 12 months and
      // costs one Firestore read per document — without a long gcTime plus
      // localStorage persistence below, every page reload re-fetches that
      // whole window from scratch, which is what burned through the
      // Firestore free-tier daily quota during development.
      gcTime: 24 * 60 * 60 * 1000, // 24h
      retry: 1,
    },
  },
})

const persister = createSyncStoragePersister({ storage: window.localStorage })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
