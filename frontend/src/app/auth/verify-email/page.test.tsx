import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VerifyEmailPage from './page'

// Mock next/navigation
const mockGet = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

// Mock Supabase client
const mockResend = vi.fn()
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { email: 'user@example.com' } } })
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resend: mockResend,
      getUser: mockGetUser,
    },
  }),
}))

describe('VerifyEmailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  it('renders check your inbox notice', async () => {
    mockGet.mockImplementation((param) => (param === 'email' ? 'test@example.com' : null))
    render(<VerifyEmailPage />)

    expect(screen.getByText(/CHECK YOUR INBOX/i)).toBeInTheDocument()
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /RESEND CONFIRMATION EMAIL/i })).toBeInTheDocument()
  })

  it('handles resend confirmation link with cooldown', async () => {
    mockGet.mockImplementation((param) => (param === 'email' ? 'test@example.com' : null))
    mockResend.mockResolvedValueOnce({ error: null })

    render(<VerifyEmailPage />)

    const resendBtn = screen.getByRole('button', { name: /RESEND CONFIRMATION EMAIL/i })
    fireEvent.click(resendBtn)

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
      })
      expect(screen.getByText(/A fresh confirmation email has been sent/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /RESEND AVAILABLE IN/i })).toBeDisabled()
    })
  })

  it('displays error message when token is invalid or expired', () => {
    mockGet.mockImplementation((param) => (param === 'error' ? 'invalid_token' : null))
    render(<VerifyEmailPage />)

    expect(screen.getByText(/The confirmation link is invalid or has expired/i)).toBeInTheDocument()
  })
})
