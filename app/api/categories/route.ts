import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  return NextResponse.json(data ?? []);
}
