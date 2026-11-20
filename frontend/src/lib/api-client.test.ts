import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './api-client'

const mockGetSession = vi.fn()
vi.mock('./supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('includes Authorization header when user session token is present', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'valid-supabase-jwt-token' },
      },
    })

    const mockResponseData = { id: 1, email: 'alex@familyguard.org', role: 'PARENT' }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockResponseData),
    })

    const result = await ApiClient.getCurrentUser()

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/users/me',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )

    const fetchCall = (global.fetch as any).mock.calls[0]
    const headers = fetchCall[1].headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer valid-supabase-jwt-token')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(result).toEqual(mockResponseData)
  })

  it('throws an error with message returned by API on failure', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Only parents can approve requests' }),
    })

    await expect(ApiClient.approvePurchaseRequest(99)).rejects.toThrow(
      'Only parents can approve requests'
    )
  })

  it('fetches the RSA public key discovery payload via getPublicKey()', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    const mockKeyData = {
      algorithm: 'RSA',
      signatureAlgorithm: 'SHA256withRSA',
      publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----',
    }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockKeyData),
    })

    const result = await ApiClient.getPublicKey()

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/security/public-key',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )
    expect(result).toEqual(mockKeyData)
    expect(result.algorithm).toBe('RSA')
    expect(result.signatureAlgorithm).toBe('SHA256withRSA')
  })

  it('receives rsaSignature and idempotencyHash on approvePurchaseRequest()', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'parent-jwt-token' } },
    })

    const mockApprovedRequest = {
      id: 42,
      familyId: 10,
      childId: 5,
      siteDomain: 'roblox.com',
      itemName: 'Robux Card',
      amount: 19.99,
      currency: 'USD',
      status: 'APPROVED',
      idempotencyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      rsaSignature: 'fO8uH7g+1k7Kq...',
      createdAt: '2026-11-20T12:00:00',
      decidedAt: '2026-11-20T12:05:00',
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockApprovedRequest),
    })

    const result = await ApiClient.approvePurchaseRequest(42)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/purchase-requests/42/approve',
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(result.status).toBe('APPROVED')
    expect(result.rsaSignature).toBe('fO8uH7g+1k7Kq...')
    expect(result.idempotencyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})
