// Validation utilities for ZyvoPay Edge Functions

import type { ValidationError } from './types.ts';

/**
 * Validate Brazilian CPF
 */
export function validateCPF(cpf: string): boolean {
  // Remove non-digits
  cpf = cpf.replace(/\D/g, '');

  // Check length
  if (cpf.length !== 11) return false;

  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Validate Brazilian CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remove non-digits
  cnpj = cnpj.replace(/\D/g, '');

  // Check length
  if (cnpj.length !== 14) return false;

  // Check for known invalid patterns
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // Validate first check digit
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Validate second check digit
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Validate document (CPF or CNPJ)
 */
export function validateDocument(document: string): boolean {
  const cleanDoc = document.replace(/\D/g, '');

  if (cleanDoc.length === 11) {
    return validateCPF(cleanDoc);
  } else if (cleanDoc.length === 14) {
    return validateCNPJ(cleanDoc);
  }

  return false;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Brazilian format)
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  // Accept 10 or 11 digits (with or without mobile 9)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Validate PIX key based on type
 */
export function validatePixKey(key: string, type: string): boolean {
  switch (type) {
    case 'CPF':
      return validateCPF(key);
    case 'CNPJ':
      return validateCNPJ(key);
    case 'EMAIL':
      return validateEmail(key);
    case 'PHONE':
      return validatePhone(key);
    case 'EVP':
      // EVP is UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(key);
    default:
      return false;
  }
}

/**
 * Validate amount in cents
 */
export function validateAmountCents(amount: number): ValidationError | null {
  if (typeof amount !== 'number') {
    return {
      field: 'amount_cents',
      message: 'Amount must be a number',
      code: 'INVALID_TYPE',
    };
  }

  if (!Number.isInteger(amount)) {
    return {
      field: 'amount_cents',
      message: 'Amount must be an integer (cents)',
      code: 'INVALID_FORMAT',
    };
  }

  if (amount <= 0) {
    return {
      field: 'amount_cents',
      message: 'Amount must be positive',
      code: 'INVALID_VALUE',
    };
  }

  if (amount > 10000000000) {
    // Max 100M reais
    return {
      field: 'amount_cents',
      message: 'Amount exceeds maximum allowed',
      code: 'AMOUNT_TOO_HIGH',
    };
  }

  return null;
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate URL
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();
}

/**
 * Validate bank code (3 digits)
 */
export function validateBankCode(code: string): boolean {
  return /^\d{3}$/.test(code);
}

/**
 * Validate bank branch (4 digits + optional check digit)
 */
export function validateBankBranch(branch: string): boolean {
  return /^\d{4}(-?\d)?$/.test(branch);
}

/**
 * Validate bank account number
 */
export function validateBankAccount(account: string): boolean {
  // Remove non-digits except hyphen
  const cleanAccount = account.replace(/[^\d-]/g, '');
  // Accept 5-13 digits with optional check digit
  return /^\d{5,13}(-?\d)?$/.test(cleanAccount);
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}
