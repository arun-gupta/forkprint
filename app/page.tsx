import { Suspense } from 'react'
import { AuthProvider } from '@/components/auth/AuthContext'
import { AuthGate } from '@/components/auth/AuthGate'
import { RepoInputClient } from '@/components/repo-input/RepoInputClient'

export default function Home() {
  return (
    <AuthProvider>
      <Suspense>
        <AuthGate>
          <RepoInputClient />
        </AuthGate>
      </Suspense>
    </AuthProvider>
  )
}
