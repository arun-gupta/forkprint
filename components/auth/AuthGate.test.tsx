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

  it('renders an opt-in deeper-permission checkbox on the unauthenticated branch', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    const checkbox = screen.getByRole('checkbox', { name: /deeper github permission/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('sign-in link includes ?elevated=1 when the checkbox is checked, and omits it when unchecked', async () => {
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

    await userEvent.click(screen.getByRole('checkbox', { name: /deeper github permission/i }))
    expect(link.getAttribute('href')).toBe('/api/auth/login?elevated=1')

    await userEvent.click(screen.getByRole('checkbox', { name: /deeper github permission/i }))
    expect(link.getAttribute('href')).toBe('/api/auth/login')
  })
})
