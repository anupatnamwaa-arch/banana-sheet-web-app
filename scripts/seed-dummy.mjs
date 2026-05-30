/**
 * Seed script — inserts dummy transactions, wealth, and budgets for a user.
 * Usage:  node scripts/seed-dummy.mjs <user-email>
 * The user must already exist in auth.users (sign up first via the app).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv needed in Node 20+)
const envPath = resolve(process.cwd(), ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((p) => p.trim()))
    .map(([k, ...v]) => [k, v.join("=")])
);

const supabase = createClient(
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/seed-dummy.mjs <user-email>"); process.exit(1); }

// Look up the user by email
const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) { console.error("Error listing users:", listErr.message); process.exit(1); }

const user = users.users.find((u) => u.email === email);
if (!user) { console.error(`User ${email} not found. Sign up first via the app.`); process.exit(1); }

const uid = user.id;
console.log(`Seeding data for ${email} (${uid})...`);

// Helper: date N days ago as ISO string
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

// ── Transactions ────────────────────────────────────────────────────────────
// Get or create category ids
const catNames = ["อาหาร", "เดินทาง", "บิล", "ช้อปปิ้ง", "เงินเดือน", "กาแฟ"];
const { data: cats } = await supabase.from("categories").select("id,name").eq("user_id", uid);
const catMap = Object.fromEntries((cats ?? []).map((c) => [c.name, c.id]));

// Insert any missing categories
for (const name of catNames) {
  if (!catMap[name]) {
    const { data } = await supabase.from("categories").insert({ user_id: uid, name }).select("id").single();
    if (data) catMap[name] = data.id;
  }
}

const txns = [
  // Income
  { amount: 45000, type: "income",  category: "เงินเดือน", note: "เงินเดือนเดือนนี้",     date: daysAgo(2)  },
  { amount: 5000,  type: "income",  category: "เงินเดือน", note: "Freelance",             date: daysAgo(8)  },
  // Expenses — this month
  { amount: 350,   type: "expense", category: "กาแฟ",      note: "Starbucks",             date: daysAgo(1)  },
  { amount: 120,   type: "expense", category: "กาแฟ",      note: "กาแฟเช้า",             date: daysAgo(3)  },
  { amount: 850,   type: "expense", category: "เดินทาง",   note: "Grab",                  date: daysAgo(3)  },
  { amount: 1200,  type: "expense", category: "บิล",       note: "Netflix",               date: daysAgo(5)  },
  { amount: 2800,  type: "expense", category: "อาหาร",    note: "ซื้อของกินทั้งสัปดาห์",  date: daysAgo(6)  },
  { amount: 3500,  type: "expense", category: "ช้อปปิ้ง", note: "Shopee",                date: daysAgo(7)  },
  { amount: 650,   type: "expense", category: "เดินทาง",   note: "BTS รายเดือน",          date: daysAgo(9)  },
  { amount: 1800,  type: "expense", category: "อาหาร",    note: "ข้าวกลางวัน รวมเดือน",  date: daysAgo(12) },
  // Expenses — last month (for trailing avg)
  { amount: 42000, type: "income",  category: "เงินเดือน", note: "เงินเดือนเดือนที่แล้ว", date: daysAgo(35) },
  { amount: 2500,  type: "expense", category: "อาหาร",    note: "อาหาร",                 date: daysAgo(35) },
  { amount: 1200,  type: "expense", category: "บิล",       note: "Netflix",               date: daysAgo(36) },
  { amount: 900,   type: "expense", category: "เดินทาง",   note: "Grab",                  date: daysAgo(38) },
  { amount: 4200,  type: "expense", category: "ช้อปปิ้ง", note: "Lazada",                date: daysAgo(40) },
  { amount: 650,   type: "expense", category: "เดินทาง",   note: "BTS",                   date: daysAgo(42) },
  { amount: 3100,  type: "expense", category: "อาหาร",    note: "อาหาร",                 date: daysAgo(45) },
];

for (const t of txns) {
  const { error } = await supabase.from("transactions").insert({
    user_id: uid,
    amount: t.amount,
    type: t.type,
    category_id: catMap[t.category] ?? null,
    note: t.note,
    date: t.date,
  });
  if (error) console.warn(`  ⚠ txn "${t.note}": ${error.message}`);
  else console.log(`  ✓ ${t.type === "income" ? "+" : "-"}${t.amount} ${t.note}`);
}

// ── Wealth & Debt ────────────────────────────────────────────────────────────
const wealth = [
  { name: "บัญชีออมทรัพย์", type: "asset",     value: 120000, is_liquid: true  },
  { name: "กองทุนรวม",       type: "asset",     value: 80000,  is_liquid: false },
  { name: "รถยนต์",          type: "asset",     value: 450000, is_liquid: false },
  { name: "บัตรเครดิต",      type: "liability", value: 15000,  is_liquid: false },
  { name: "กู้ยืมส่วนตัว",   type: "liability", value: 30000,  is_liquid: false },
];
for (const w of wealth) {
  const { error } = await supabase.from("wealth_debt").insert({ user_id: uid, ...w });
  if (error) console.warn(`  ⚠ wealth "${w.name}": ${error.message}`);
  else console.log(`  ✓ wealth: ${w.name} ${w.type} ฿${w.value}`);
}

// ── Budgets ──────────────────────────────────────────────────────────────────
const budgets = [
  { category: "อาหาร",    limit: 8000  },
  { category: "เดินทาง",  limit: 3000  },
  { category: "ช้อปปิ้ง", limit: 5000  },
  { category: "บิล",      limit: 2000  },
  { category: "กาแฟ",     limit: 1500  },
];
for (const b of budgets) {
  const catId = catMap[b.category];
  if (!catId) { console.warn(`  ⚠ budget: category ${b.category} not found`); continue; }
  const { error } = await supabase.from("budgets").upsert(
    { user_id: uid, category_id: catId, limit_amount: b.limit },
    { onConflict: "user_id,category_id" }
  );
  if (error) console.warn(`  ⚠ budget "${b.category}": ${error.message}`);
  else console.log(`  ✓ budget: ${b.category} ฿${b.limit}/mo`);
}

console.log("\n✅ Done! Start the dev server and log in.");
