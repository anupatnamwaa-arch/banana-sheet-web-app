// app/(dashboard)/roast/page.tsx
import { getPastRoasts } from "@/app/actions/roast";
import { RoastPageClient } from "./_components/RoastPageClient";

export default async function RoastPage() {
  const initialRoasts = await getPastRoasts();
  return <RoastPageClient initialRoasts={initialRoasts} />;
}
