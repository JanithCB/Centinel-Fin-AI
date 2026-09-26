import { createClient } from './supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface UserProfile {
  id: number;
  authId: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: 'PARENT' | 'CHILD';
  createdAt: string;
}

export interface FamilyResponse {
  id: number;
  name: string;
  createdAt: string;
}

export interface PurchaseRequestDTO {
  id: number;
  familyId: number;
  childId: number;
  siteDomain: string;
  itemName: string;
  amount: number;
  currency: string;
  category?: string;
  note?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  decidedAt?: string;
}

export interface CreatePurchaseRequestPayload {
  siteDomain: string;
  itemName: string;
  amount: number;
  currency?: string;
  category?: string;
  note?: string;
}

export class ApiClient {
  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const supabase = createClient();
    
    // Get the current session to extract the JWT token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(options.headers);
    
    // Add the Authorization header if we have a token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignored
      }
      throw new Error(errorMessage);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  // User Endpoints
  static async registerUser(role: 'PARENT' | 'CHILD', displayName?: string, phoneNumber?: string): Promise<UserProfile> {
    return this.request<UserProfile>('/users/register', {
      method: 'POST',
      body: JSON.stringify({ role, displayName, phoneNumber }),
    });
  }

  static async getCurrentUser(): Promise<UserProfile> {
    return this.request<UserProfile>('/users/me');
  }

  // Family Endpoints
  static async createFamily(name: string, parentUserId: number): Promise<FamilyResponse> {
    return this.request<FamilyResponse>('/families', {
      method: 'POST',
      body: JSON.stringify({ name, parentUserId }),
    });
  }

  static async addFamilyMember(familyId: number, childUserId: number): Promise<void> {
    return this.request<void>(`/families/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify({ childUserId }),
    });
  }

  // Purchase Requests Endpoints
  static async createPurchaseRequest(payload: CreatePurchaseRequestPayload): Promise<PurchaseRequestDTO> {
    return this.request<PurchaseRequestDTO>('/purchase-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getMyPurchaseRequests(): Promise<PurchaseRequestDTO[]> {
    return this.request<PurchaseRequestDTO[]>('/purchase-requests/me');
  }

  static async getFamilyPurchaseRequests(): Promise<PurchaseRequestDTO[]> {
    return this.request<PurchaseRequestDTO[]>('/purchase-requests/family');
  }

  static async approvePurchaseRequest(requestId: number): Promise<PurchaseRequestDTO> {
    return this.request<PurchaseRequestDTO>(`/purchase-requests/${requestId}/approve`, {
      method: 'POST',
    });
  }

  static async denyPurchaseRequest(requestId: number): Promise<PurchaseRequestDTO> {
    return this.request<PurchaseRequestDTO>(`/purchase-requests/${requestId}/deny`, {
      method: 'POST',
    });
  }
}
