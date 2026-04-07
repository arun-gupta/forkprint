import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignInButton } from './SignInButton'

describe('SignInButton', () => {
  it('renders a sign-in button', () => {
    render(<SignInButton />)
    expect(screen.getByRole('link', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('links to the OAuth login route', () => {
    render(<SignInButton />)
    expect(screen.getByRole('link', { name: /sign in with github/i })).toHaveAttribute('href', '/api/auth/login')
  })
})
