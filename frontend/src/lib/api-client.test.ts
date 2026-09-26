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
})
