import { createClient } from './supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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
      // Try to parse the error message from the response
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Ignored
      }
      throw new Error(errorMessage);
    }

    // Check if the response has content before parsing JSON
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  // Example API methods
  static async getFamilyDetails() {
    return this.request('/family');
  }

  static async registerUser(role: 'PARENT' | 'CHILD') {
    return this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }
}
