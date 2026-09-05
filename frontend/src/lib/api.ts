// ── Types ────────────────────────────────────────────────────
export interface SummaryResponse {
  totalsPerPeriod: Record<string, number>;
  totalsByCategory: Record<string, number>;
}

export interface IngestionRequest {
  source: string;
  externalMessageId: string;
  userReference: string;
  messageText: string;
  receivedAt: string;
}

export interface IngestionResponse {
  id: string;
  externalMessageId: string;
  status: string;
  message: string;
  timestamp?: string;
}

export interface HealthResponse {
  status: string;
  components?: Record<string, { status: string }>;
}

// ── Base fetch helper ────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${errorText}`);
  }
  return res.json() as Promise<T>;
}

// ── API Calls ────────────────────────────────────────────────

/**
 * GET /api/summary?phone={phone}&period={period}
 */
export async function getSummary(
  phone: string = 'demo-user-001',
  period: string = 'monthly',
): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>(
    `/api/summary?phone=${encodeURIComponent(phone)}&period=${encodeURIComponent(period)}`,
  );
}

/**
 * POST /api/v1/ingestion/transaction-messages
 * Requires X-INGESTION-API-KEY header.
 */
export async function ingestMessage(payload: IngestionRequest): Promise<IngestionResponse> {
  const apiKey = process.env.NEXT_PUBLIC_INGESTION_API_KEY ?? '';
  return apiFetch<IngestionResponse>('/api/v1/ingestion/transaction-messages', {
    method: 'POST',
    headers: { 'X-INGESTION-API-KEY': apiKey },
    body: JSON.stringify(payload),
  });
}

/**
 * GET /actuator/health
 */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/actuator/health');
}
