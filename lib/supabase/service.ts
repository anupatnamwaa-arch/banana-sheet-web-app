import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS — server-only, never import in client code.
 * Used solely at trusted boundaries: the ingestion API (ADR-0001), the Telegram
 * verification webhook (ADR-0002), and promo-code redemption.
 */
export function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
