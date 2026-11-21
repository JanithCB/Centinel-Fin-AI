import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DashboardPage from './page'
import { ApiClient } from '@/lib/api-client'

// Mock next/navigation with stable router reference
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockRouter = {
  push: mockPush,
  refresh: mockRefresh,
}
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock Supabase
const mockGetSession = vi.fn()
const mockSignOut = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
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
    getFamilyMembers: vi.fn().mockResolvedValue([]),
    approvePurchaseRequest: vi.fn(),
    denyPurchaseRequest: vi.fn(),
    getPublicKey: vi.fn().mockResolvedValue({
      algorithm: 'RSA',
      signatureAlgorithm: 'SHA256withRSA',
      publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----',
    }),
  },
}))

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'parent@example.com',
            email_confirmed_at: '2026-01-01T00:00:00Z',
          },
        },
      },
    })
    mockSignOut.mockResolvedValue({ error: null })
    vi.mocked(ApiClient.getFamilyPurchaseRequests).mockResolvedValue([])
    vi.mocked(ApiClient.getMyPurchaseRequests).mockResolvedValue([])
    vi.mocked(ApiClient.getFamilyMembers).mockResolvedValue([])
  })

  it('renders Parent Onboarding state when parent has no family', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
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
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
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

  it('renders Parent Dashboard with mission control UX, clickable merchant links, and modal child management', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
      id: 1,
      authId: 'auth-parent-1',
      email: 'parent@example.com',
      displayName: 'Alex Parent',
      role: 'PARENT',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: 10,
      familyName: 'Turner Family',
    })

    vi.mocked(ApiClient.getFamilyPurchaseRequests).mockResolvedValue([
      {
        id: 301,
        familyId: 10,
        childId: 5,
        childName: 'Sam Child',
        siteDomain: 'store.steampowered.com',
        itemName: 'Xbox Game Pass 1-Month',
        amount: 29.99,
        currency: 'USD',
        category: 'ENTERTAINMENT',
        note: 'Weekend gaming with friends',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    ])

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/FAMILY: Turner Family/i)).toBeInTheDocument()
      expect(screen.getByText(/Family Purchase Requests/i)).toBeInTheDocument()
      expect(screen.getByText(/Pending Cost:\s*\$29\.99 USD/i)).toBeInTheDocument()
      expect(screen.getByText(/Xbox Game Pass 1-Month/i)).toBeInTheDocument()
      expect(screen.getByText(/Weekend gaming with friends/i)).toBeInTheDocument()
    })

    const merchantLink = screen.getByRole('link', {
      name: /Visit Merchant \(store\.steampowered\.com\)/i,
    })
    expect(merchantLink).toHaveAttribute('href', 'https://store.steampowered.com')
    expect(merchantLink).toHaveAttribute('target', '_blank')
    expect(merchantLink).toHaveAttribute('rel', 'noopener noreferrer')

    // Add Child form should NOT clutter the main dashboard initially
    expect(screen.queryByText(/Add Child by User ID/i)).not.toBeInTheDocument()

    // Clicking Manage Children opens the AddChildModal
    const manageChildrenBtn = screen.getByText(/Manage Children/i).closest('button')!
    fireEvent.click(manageChildrenBtn)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Add Child by User ID/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Add$/i })).toBeInTheDocument()
    })
  })

  it('renders Child Dashboard with request form when child has family', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
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
