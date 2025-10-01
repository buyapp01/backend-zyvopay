// Celcoin API Client for ZyvoPay Edge Functions

import type {
  CelcoinAuthResponse,
  CelcoinPixPaymentRequest,
  CelcoinPixPaymentResponse,
  CelcoinDictLookupResponse,
} from './types.ts';

export class CelcoinClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.baseUrl = Deno.env.get('CELCOIN_BASE_URL') || 'https://sandbox.celcoin.com.br';
    this.clientId = Deno.env.get('CELCOIN_CLIENT_ID') || '';
    this.clientSecret = Deno.env.get('CELCOIN_CLIENT_SECRET') || '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing CELCOIN_CLIENT_ID or CELCOIN_CLIENT_SECRET');
    }
  }

  /**
   * Get OAuth2 access token (with caching)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log('[Celcoin] Requesting new access token...');

    const response = await fetch(`${this.baseUrl}/v5/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Celcoin] Auth error:', error);
      throw new Error(`Celcoin authentication failed: ${response.status}`);
    }

    const data: CelcoinAuthResponse = await response.json();

    // Cache token (expires in 1 hour typically, we refresh 5min early)
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

    console.log('[Celcoin] Access token obtained, expires in', data.expires_in, 'seconds');

    return this.accessToken;
  }

  /**
   * Make authenticated request to Celcoin API
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getAccessToken();

    const url = `${this.baseUrl}${endpoint}`;

    console.log(`[Celcoin] ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[Celcoin] Error ${response.status}:`, responseText);
      throw new Error(
        `Celcoin API error: ${response.status} - ${responseText}`,
      );
    }

    // Try to parse JSON, return text if fails
    try {
      return JSON.parse(responseText) as T;
    } catch {
      return responseText as T;
    }
  }

  /**
   * PIX DICT Lookup - Get account info from PIX key
   */
  async pixDictLookup(pixKey: string, keyType: string): Promise<CelcoinDictLookupResponse> {
    return this.request<CelcoinDictLookupResponse>(
      `/pix/v1/dict/lookup`,
      {
        method: 'POST',
        body: JSON.stringify({
          key: pixKey,
          keyType: keyType,
        }),
      },
    );
  }

  /**
   * Create PIX Payment
   */
  async createPixPayment(
    request: CelcoinPixPaymentRequest,
  ): Promise<CelcoinPixPaymentResponse> {
    return this.request<CelcoinPixPaymentResponse>(
      `/pix/v1/payment`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );
  }

  /**
   * Get PIX Payment Status
   */
  async getPixPaymentStatus(transactionId: string): Promise<any> {
    return this.request(
      `/pix/v1/payment/${transactionId}`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * Cancel PIX Payment (if pending)
   */
  async cancelPixPayment(transactionId: string): Promise<any> {
    return this.request(
      `/pix/v1/payment/${transactionId}/cancel`,
      {
        method: 'POST',
      },
    );
  }

  /**
   * Get Account Balance
   */
  async getBalance(accountId: string): Promise<any> {
    return this.request(
      `/baas/v1/accounts/${accountId}/balance`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * Get Account Statement
   */
  async getStatement(
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    return this.request(
      `/baas/v1/accounts/${accountId}/statement?${params}`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * Create TED Transfer
   */
  async createTedTransfer(data: {
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    bankCode: string;
    branch: string;
    accountNumber: string;
    accountType: string;
    beneficiaryName: string;
    beneficiaryDocument: string;
    description: string;
  }): Promise<any> {
    return this.request(
      `/ted/v1/transfer`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Register PIX Key
   */
  async registerPixKey(data: {
    accountId: string;
    key: string;
    keyType: string;
  }): Promise<any> {
    return this.request(
      `/pix/v1/keys/register`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Delete PIX Key
   */
  async deletePixKey(pixKeyId: string): Promise<any> {
    return this.request(
      `/pix/v1/keys/${pixKeyId}`,
      {
        method: 'DELETE',
      },
    );
  }

  /**
   * Create Subaccount
   */
  async createSubaccount(data: {
    accountType: 'PJ' | 'PF';
    ownerName: string;
    ownerDocument: string;
    ownerEmail: string;
    ownerPhone: string;
  }): Promise<any> {
    return this.request(
      `/baas/v1/accounts`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }
}

// Singleton instance
let celcoinClient: CelcoinClient | null = null;

/**
 * Get shared Celcoin client instance
 */
export function getCelcoinClient(): CelcoinClient {
  if (!celcoinClient) {
    celcoinClient = new CelcoinClient();
  }
  return celcoinClient;
}
