import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignInPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

describe('SignInPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sign in form with inputs and sign in button', () => {
    render(<SignInPage />)
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument()
  })

  it('handles password visibility toggle', () => {
    render(<SignInPage />)
    const passwordInput = screen.getByPlaceholderText(/Enter your security passkey/i) as HTMLInputElement
    const toggleButton = screen.getByLabelText(/Toggle password visibility/i)

    expect(passwordInput.type).toBe('password')
    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('text')
    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('password')
  })

  it('submits valid credentials and redirects on success', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    })

    render(<SignInPage />)
    const submitButton = screen.getByRole('button', { name: /SIGN IN/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'alex.turner@familyguard.internal',
        password: '12345678',
      })
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('displays error message when login fails', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    render(<SignInPage />)
    const submitButton = screen.getByRole('button', { name: /SIGN IN/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials/i)).toBeInTheDocument()
    })
  })
})
