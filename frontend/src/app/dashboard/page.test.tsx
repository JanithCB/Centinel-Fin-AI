import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from './page'
import { ApiClient } from '@/lib/api-client'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              email: 'parent@example.com',
              email_confirmed_at: '2026-01-01T00:00:00Z',
            },
          },
        },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

// Mock ApiClient
vi.mock('@/lib/api-client', () => ({
  ApiClient: {
    getCurrentUser: vi.fn(),
    getFamilyPurchaseRequests: vi.fn().mockResolvedValue([]),
    getMyPurchaseRequests: vi.fn().mockResolvedValue([]),
    createFamily: vi.fn(),
    addFamilyMember: vi.fn(),
  },
}))

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Parent Onboarding state when parent has no family', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValueOnce({
      id: 1,
      authId: 'auth-parent-1',
      email: 'parent@example.com',
      displayName: 'Alex Parent',
      role: 'PARENT',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: null,
      familyName: null,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Create Your Family Group/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Family & Continue/i })).toBeInTheDocument()
    })
  })

  it('renders Child Waiting screen when child has no family', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValueOnce({
      id: 2,
      authId: 'auth-child-2',
      email: 'child@example.com',
      displayName: 'Sam Child',
      role: 'CHILD',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: null,
      familyName: null,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Waiting to Join Family/i)).toBeInTheDocument()
      expect(screen.getByText(/STATUS: AWAITING FAMILY LINK/i)).toBeInTheDocument()
      expect(screen.getByText(/#2/i)).toBeInTheDocument()
    })
  })

  it('renders Parent Dashboard with family requests when parent has family', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValueOnce({
      id: 1,
      authId: 'auth-parent-1',
      email: 'parent@example.com',
      displayName: 'Alex Parent',
      role: 'PARENT',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: 10,
      familyName: 'Turner Family',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/FAMILY: Turner Family/i)).toBeInTheDocument()
      expect(screen.getByText(/Family Purchase Requests/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Add$/i })).toBeInTheDocument()
    })
  })

  it('renders Child Dashboard with request form when child has family', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValueOnce({
      id: 2,
      authId: 'auth-child-2',
      email: 'child@example.com',
      displayName: 'Sam Child',
      role: 'CHILD',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: 10,
      familyName: 'Turner Family',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Ask for Purchase/i)).toBeInTheDocument()
      expect(screen.getByText(/My Purchase Requests/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Submit for Approval/i })).toBeInTheDocument()
    })
  })
})
