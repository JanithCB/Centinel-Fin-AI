import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignUpPage from './page'

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
const mockSignUp = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}))

// Mock ApiClient
vi.mock('@/lib/api-client', () => ({
  ApiClient: {
    registerUser: vi.fn().mockResolvedValue({ id: 1 }),
  },
}))

describe('SignUpPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sign up form with role selection options', () => {
    render(<SignUpPage />)
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByText(/Family Lead/i)).toBeInTheDocument()
    expect(screen.getByText(/Collaborator/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CREATE ACCOUNT/i })).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    render(<SignUpPage />)
    
    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/^Password$/i)
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i)
    const submitButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password999' } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  it('invokes Supabase signUp with role metadata when form is valid', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    })

    render(<SignUpPage />)

    const emailInput = screen.getByLabelText(/Email Address/i)
    const passwordInput = screen.getByLabelText(/^Password$/i)
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i)
    const submitButton = screen.getByRole('button', { name: /CREATE ACCOUNT/i })

    fireEvent.change(emailInput, { target: { value: 'parent@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'parent@example.com',
        password: 'password123',
        options: {
          data: {
            role: 'PARENT',
          },
        },
      })
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
