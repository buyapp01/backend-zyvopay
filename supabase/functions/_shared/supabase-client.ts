// Shared Supabase client for ZyvoPay Edge Functions

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

/**
 * Creates a Supabase client with Service Role Key
 * Use this for backend operations that bypass RLS
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client with user's auth token
 * Use this for user-scoped operations with RLS
 */
export function createAuthClient(authToken: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper to call RPC functions
 */
export async function callRPC<T = any>(
  functionName: string,
  params: Record<string, any> = {},
): Promise<{ data: T | null; error: any }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc(functionName, params);

  if (error) {
    console.error(`RPC Error [${functionName}]:`, error);
  }

  return { data, error };
}

/**
 * Helper to query table with filters
 */
export async function queryTable<T = any>(
  tableName: string,
  filters?: Record<string, any>,
  select = '*',
): Promise<{ data: T[] | null; error: any }> {
  const supabase = createServiceClient();

  let query = supabase.from(tableName).select(select);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Query Error [${tableName}]:`, error);
  }

  return { data, error };
}

/**
 * Helper to insert data
 */
export async function insertRow<T = any>(
  tableName: string,
  data: Partial<T>,
): Promise<{ data: T | null; error: any }> {
  const supabase = createServiceClient();

  const result = await supabase.from(tableName).insert(data).select().single();

  if (result.error) {
    console.error(`Insert Error [${tableName}]:`, result.error);
  }

  return result;
}

/**
 * Helper to update data
 */
export async function updateRow<T = any>(
  tableName: string,
  id: string,
  data: Partial<T>,
): Promise<{ data: T | null; error: any }> {
  const supabase = createServiceClient();

  const result = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (result.error) {
    console.error(`Update Error [${tableName}]:`, result.error);
  }

  return result;
}

/**
 * Helper to get Vault secrets
 */
export async function getVaultSecret(secretName: string): Promise<string | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('vault.decrypted_secrets')
    .select('decrypted_secret')
    .eq('name', secretName)
    .single();

  if (error) {
    console.error(`Vault Error [${secretName}]:`, error);
    return null;
  }

  return data?.decrypted_secret || null;
}
