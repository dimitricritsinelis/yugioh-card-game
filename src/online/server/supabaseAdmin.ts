import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface ServerEnv {
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly GAME_SEAT_TOKEN_SALT?: string;
}

let cachedClient: SupabaseClient | null = null;

export function getServerEnv(): ServerEnv {
  const maybeGlobal = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return maybeGlobal.process?.env ?? {};
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export function getSeatTokenSalt(): string {
  const salt = getServerEnv().GAME_SEAT_TOKEN_SALT;

  if (!salt) {
    throw new Error("Missing GAME_SEAT_TOKEN_SALT.");
  }

  return salt;
}
