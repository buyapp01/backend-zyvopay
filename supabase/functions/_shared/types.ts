// Shared TypeScript types for ZyvoPay Edge Functions

// ============================================================
// Database Types
// ============================================================

export type TransactionType =
  | 'pix_payment'
  | 'pix_receipt'
  | 'ted'
  | 'internal_transfer'
  | 'fee'
  | 'chargeback'
  | 'refund';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'reversed';

export type AccountStatus =
  | 'pending_kyc'
  | 'active'
  | 'suspended'
  | 'blocked'
  | 'closed';

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

export type WebhookEventType =
  | 'transaction.completed'
  | 'transaction.failed'
  | 'pix.received'
  | 'pix.refunded'
  | 'account.created'
  | 'account.suspended'
  | 'balance.updated';

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

// ============================================================
// Database Records
// ============================================================

export interface Transaction {
  id: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount_cents: number;
  debit_subaccount_id?: string;
  credit_subaccount_id?: string;
  client_id: string;
  client_request_id?: string;
  pix_key?: string;
  pix_key_type?: PixKeyType;
  pix_end_to_end_id?: string;
  ted_bank_code?: string;
  ted_agency?: string;
  ted_account?: string;
  ted_recipient_name?: string;
  ted_recipient_document?: string;
  celcoin_transaction_id?: string;
  description?: string;
  fee_cents?: number;
  initiated_at: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Subaccount {
  id: string;
  client_id: string;
  account_type: 'PJ' | 'PF';
  status: AccountStatus;
  owner_name: string; // Encrypted
  owner_document: string; // Encrypted
  owner_email?: string; // Encrypted
  owner_phone?: string; // Encrypted
  celcoin_account_id?: string;
  celcoin_account_number?: string;
  celcoin_agency?: string;
  balance_cents: number;
  blocked_balance_cents: number;
  daily_pix_limit_cents?: number;
  daily_ted_limit_cents?: number;
  kyc_completed_at?: string;
  kyc_data?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  client_id: string;
  webhook_url: string;
  event_type: WebhookEventType;
  transaction_id?: string;
  payload: Record<string, any>;
  signature?: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  max_attempts: number;
  response_status?: number;
  response_body?: string;
  next_retry_at?: string;
  last_attempt_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  legal_name?: string;
  document: string;
  email: string;
  phone?: string;
  owner_id?: string;
  status: AccountStatus;
  is_active: boolean;
  celcoin_client_id?: string;
  monthly_transaction_limit?: number;
  transaction_fee_cents?: number;
  webhook_url?: string;
  webhook_secret?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Celcoin API Types
// ============================================================

export interface CelcoinAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CelcoinPixPaymentRequest {
  amount: number;
  receiver: {
    key: string;
    keyType: string;
  };
  clientCode: string;
  description: string;
  urgency: 'HIGH' | 'NORMAL';
  initiationType: 'MANUAL' | 'KEY' | 'DICT';
}

export interface CelcoinPixPaymentResponse {
  transactionId: string;
  status: string;
  e2eId?: string;
  receiver: {
    name: string;
    taxId: string;
    bankName: string;
  };
  amount: number;
  createdAt: string;
}

export interface CelcoinWebhookPayload {
  eventType: string;
  transactionId: string;
  e2eId?: string;
  status: string;
  amount?: number;
  sender?: {
    name: string;
    taxId: string;
  };
  receiver?: {
    name: string;
    taxId: string;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CelcoinDictLookupResponse {
  key: string;
  keyType: string;
  account: {
    participant: string;
    branch: string;
    accountNumber: string;
    accountType: string;
  };
  owner: {
    type: string;
    taxIdNumber: string;
    name: string;
  };
  creationDate: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  transaction_id?: string;
  message?: string;
}

// ============================================================
// Utility Types
// ============================================================

export interface DatabaseWebhookPayload<T = any> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T;
  old_record?: T;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
