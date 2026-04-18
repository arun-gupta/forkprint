import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { AuthGate } from './AuthGate'

const mockUseSearchParams = vi.fn(() => new URLSearchParams())

// Mock useRouter/useSearchParams — Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}))

describe('AuthGate', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    // Reset location hash before each test
    Object.defineProperty(window, 'location', {
      value: { hash: '', href: 'http://localhost/', replace: vi.fn() },
      writable: true,
    })
  })

  it('shows sign-in button when unauthenticated', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByRole('link', { name: /sign in with github/i })).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('shows children when authenticated', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in with github/i })).not.toBeInTheDocument()
  })

  it('shows error message when auth_error query param is present', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('auth_error=access_denied'))
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('renders three scope-tier radios on the unauthenticated branch, with baseline selected by default', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    const baseline = screen.getByRole('radio', { name: /baseline/i })
    const readOrg = screen.getByRole('radio', { name: /read org membership/i })
    const adminOrg = screen.getByRole('radio', { name: /org admin \(read\)/i })

    expect(baseline).toBeChecked()
    expect(readOrg).not.toBeChecked()
    expect(adminOrg).not.toBeChecked()
  })

  it('sign-in link reflects the selected scope tier', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    const link = screen.getByRole('link', { name: /sign in with github/i })
    expect(link.getAttribute('href')).toBe('/api/auth/login')

    await userEvent.click(screen.getByRole('radio', { name: /read org membership/i }))
    expect(link.getAttribute('href')).toBe('/api/auth/login?scope_tier=read-org')

    await userEvent.click(screen.getByRole('radio', { name: /org admin \(read\)/i }))
    expect(link.getAttribute('href')).toBe('/api/auth/login?scope_tier=admin-org')

    await userEvent.click(screen.getByRole('radio', { name: /baseline/i }))
    expect(link.getAttribute('href')).toBe('/api/auth/login')
  })

  it('each scope tier carries a brief guidance line to help the user decide', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByText(/public data only/i)).toBeInTheDocument()
    expect(screen.getByText(/concealed admins/i)).toBeInTheDocument()
    expect(screen.getByText(/2fa enforcement/i)).toBeInTheDocument()
  })

  it('omits the solo-maintainer footnote that previously sat below the picker', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.queryByText(/solo-maintainer repos are auto-detected/i)).not.toBeInTheDocument()
  })
})
