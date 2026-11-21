import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ApprovalsPage from './page'
import { ApiClient } from '@/lib/api-client'

// Mock next/navigation with stable router reference
const mockPush = vi.fn()
const mockRouter = { push: mockPush }
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

// Mock Supabase
const mockGetSession = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

// Mock ApiClient
vi.mock('@/lib/api-client', () => ({
  ApiClient: {
    getCurrentUser: vi.fn(),
    getFamilyPurchaseRequests: vi.fn(),
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

describe('ApprovalsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'parent.test@example.com',
            email_confirmed_at: '2026-01-01T00:00:00Z',
          },
        },
      },
    })
  })

  it('renders Parent Approvals Center with summary KPI counters and pending requests', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
      id: 1,
      authId: 'auth-parent-1',
      email: 'parent.test@example.com',
      displayName: 'Alex Parent',
      role: 'PARENT',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: 10,
      familyName: 'Turner Family',
    })

    vi.mocked(ApiClient.getFamilyPurchaseRequests).mockResolvedValue([
      {
        id: 101,
        familyId: 10,
        childId: 5,
        childName: 'Leo Turner',
        siteDomain: 'store.steampowered.com',
        itemName: 'Hollow Knight Game',
        amount: 14.99,
        currency: 'USD',
        category: 'GAMING',
        note: 'Completed all chores for the week',
        status: 'PENDING',
        idempotencyHash: 'abc123hash',
        createdAt: new Date().toISOString(),
      },
    ])

    render(<ApprovalsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Parent Approvals Center/i)).toBeInTheDocument()
      expect(screen.getByText(/PG-4 SUPERVISOR/i)).toBeInTheDocument()
      expect(screen.getByText(/Hollow Knight Game/i)).toBeInTheDocument()
      expect(screen.getByText(/store.steampowered.com/i)).toBeInTheDocument()
      expect(screen.getByText(/Leo Turner/i)).toBeInTheDocument()
      expect(screen.getByText(/\$14.99/i)).toBeInTheDocument()
      expect(screen.getByText(/Completed all chores for the week/i)).toBeInTheDocument()
    })
  })

  it('allows parent to approve a pending request and receive RSA signature', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
      id: 1,
      authId: 'auth-parent-1',
      email: 'parent.test@example.com',
      displayName: 'Alex Parent',
      role: 'PARENT',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: 10,
      familyName: 'Turner Family',
    })

    vi.mocked(ApiClient.getFamilyPurchaseRequests).mockResolvedValue([
      {
        id: 202,
        familyId: 10,
        childId: 5,
        childName: 'Leo Turner',
        siteDomain: 'roblox.com',
        itemName: '1000 Robux Card',
        amount: 19.99,
        currency: 'USD',
        category: 'GAMING',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    ])

    vi.mocked(ApiClient.approvePurchaseRequest).mockResolvedValueOnce({
      id: 202,
      familyId: 10,
      childId: 5,
      siteDomain: 'roblox.com',
      itemName: '1000 Robux Card',
      amount: 19.99,
      currency: 'USD',
      status: 'APPROVED',
      rsaSignature: 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...',
      idempotencyHash: 'sha256-idempotency-token-202',
      createdAt: new Date().toISOString(),
      decidedAt: new Date().toISOString(),
    })

    render(<ApprovalsPage />)

    await waitFor(() => {
      expect(screen.getByText(/1000 Robux Card/i)).toBeInTheDocument()
    })

    const approveButton = screen.getByText('Approve').closest('button')!
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(ApiClient.approvePurchaseRequest).toHaveBeenCalledWith(202)
      expect(screen.getByText(/Cryptographic RSA-2048 signature generated/i)).toBeInTheDocument()
    })
  })

  it('restricts access when a child account attempts to view the parent approvals queue', async () => {
    vi.mocked(ApiClient.getCurrentUser).mockResolvedValue({
      id: 2,
      authId: 'auth-child-2',
      email: 'child.test@example.com',
      displayName: 'Sam Child',
      role: 'CHILD',
      createdAt: '2026-01-01T00:00:00Z',
      familyId: 10,
      familyName: 'Turner Family',
    })

    render(<ApprovalsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Parent Portal Restricted/i)).toBeInTheDocument()
      expect(screen.getByText(/Only verified parents hold cryptographic supervisory authority/i)).toBeInTheDocument()
    })
  })
})
