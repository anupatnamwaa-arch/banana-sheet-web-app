import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed `middleware` -> `proxy` (Node runtime, no edge).
 * Refreshes the Supabase auth session on every request so Server Components
 * always see a valid user. Do NOT run between getting the session and using it.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the user to trigger token refresh + cookie rotation.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on everything except static assets and the ingestion/webhook API
  // (those authenticate via api_key / shared secret, not the session cookie).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/transactions|api/telegram|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
