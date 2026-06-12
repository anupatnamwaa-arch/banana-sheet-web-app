import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { TransactionType } from "@/lib/types";

// The ingestion boundary (ADR-0001): authenticated by the user's api_key, not a
// session. Runs with the service role and resolves the user from the key.
export const runtime = "nodejs";

interface IngestPayload {
  amount?: number;
  category?: string;
  type?: string;
  date?: string;
  note?: string;
  wallet?: string;
  account?: string;
}

function extractApiKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}

function normalizeType(value: string | undefined): TransactionType | null {
  const normalized = value?.trim().toLowerCase() ?? "expense";
  if (normalized === "income" || normalized === "expense" || normalized === "savings") {
    return normalized;
  }
  if (normalized === "saving" || normalized === "save") {
    return "savings";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  let body: IngestPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const type = normalizeType(body.type);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (type !== "income" && type !== "expense" && type !== "savings") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve the user from the api_key.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const userId = profile.id as string;

  // Resolve / auto-create the category (controlled vocab, case-insensitive).
  let categoryId: string | null = null;
  const categoryName = body.category?.trim();
  if (categoryName) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", categoryName)
      .maybeSingle();

    if (existing) {
      categoryId = existing.id as string;
    } else {
      const { data: created } = await supabase
        .from("categories")
        .insert({ user_id: userId, name: categoryName, type })
        .select("id")
        .single();
      categoryId = created?.id ?? null;
    }
  }

  // Resolve an optional wallet/account by name for Shortcut flows like
  // "Savings > Cash", where the leaf selection is sent as a plain string.
  let walletId: string | null = null;
  const walletName = body.wallet?.trim() || body.account?.trim();
  if (walletName) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", walletName)
      .maybeSingle();
    walletId = wallet?.id ?? null;
  }

  // Best-effort brand match from the note against the shared catalog.
  let brandId: string | null = null;
  const note = body.note?.trim() ?? null;
  if (note) {
    const { data: brands } = await supabase
      .from("brands")
      .select("id, name, aliases");
    const haystack = note.toLowerCase();
    const match = (brands ?? []).find((b) => {
      const terms = [b.name, ...(b.aliases ?? [])].map((t: string) =>
        t.toLowerCase(),
      );
      return terms.some((t) => haystack.includes(t));
    });
    brandId = match?.id ?? null;
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    amount,
    type,
    category_id: categoryId,
    wallet_id: walletId,
    brand_id: brandId,
    note,
    // Treat an incoming date as-is (Bangkok-local per ADR-0003); default to now.
    date: body.date ?? new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
