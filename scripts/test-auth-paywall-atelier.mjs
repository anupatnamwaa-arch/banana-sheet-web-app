import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared Atelier UI exposes theme persistence and all banana guide poses", async () => {
  const [themeToggle, shell, guide, css] = await Promise.all([
    read("app/_components/atelier/ThemeToggle.tsx"),
    read("app/_components/atelier/AtelierShell.tsx"),
    read("app/_components/atelier/BananaGuide.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(themeToggle, /localStorage\.getItem\("bs-theme"\)/);
  assert.match(themeToggle, /localStorage\.setItem\("bs-theme"/);
  assert.match(themeToggle, /document\.documentElement\.setAttribute\("data-theme"/);
  assert.match(shell, /atelier-peel/);
  assert.match(guide, /"welcome"/);
  assert.match(guide, /"helpful"/);
  assert.match(guide, /"waiting"/);
  assert.match(guide, /"retry"/);
  assert.match(guide, /"celebrate"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{.*?\.atelier-banana-float[^{]*\{[^}]*animation:\s*none/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{.*?\.atelier-card-arrive[^{]*\{[^}]*animation:\s*none/s);
});

test("Auth presentation uses Atelier components while keeping Supabase behavior", async () => {
  const [loginPage, loginForm, forgotForm, resetForm] = await Promise.all([
    read("app/(auth)/login/page.tsx"),
    read("app/(auth)/login/_components/LoginForm.tsx"),
    read("app/(auth)/forgot-password/_components/ForgotPasswordForm.tsx"),
    read("app/(auth)/reset-password/_components/ResetPasswordForm.tsx"),
  ]);

  assert.match(loginPage, /<AtelierShell\b/);
  assert.match(loginPage, /<AtelierCard\b/);
  assert.match(loginPage, /<AtelierBrand\b/);
  assert.doesNotMatch(loginPage, /<BananaGuide\b/);
  assert.match(loginForm, /signInWithPassword/);
  assert.match(loginForm, /signUp/);
  assert.match(loginForm, /signInWithOAuth/);
  assert.match(loginForm, /\/auth\/callback/);
  assert.match(loginForm, /getSession/);
  assert.match(loginForm, /onAuthStateChange/);
  assert.match(loginForm, /\/overview/);
  assert.match(forgotForm, /<AtelierShell\b/);
  assert.match(forgotForm, /<AtelierCard\b/);
  assert.match(forgotForm, /resetPasswordForEmail/);
  assert.match(forgotForm, /\/reset-password/);
  assert.match(forgotForm, /sent \? "celebrate" : "helpful"/);
  assert.match(resetForm, /<AtelierShell\b/);
  assert.match(resetForm, /<AtelierCard\b/);
  assert.match(resetForm, /updateUser\(\{ password \}\)/);
  assert.match(resetForm, /<BananaGuide\s+pose="helpful"/);
  assert.match(resetForm, /\/overview/);
});

test("Paywall gets language context and preserves payment boundaries", async () => {
  const [page, client, actions] = await Promise.all([
    read("app/paywall/page.tsx"),
    read("app/paywall/_components/PaywallClient.tsx"),
    read("app/actions/paywall.ts"),
  ]);

  assert.match(page, /LanguageProvider/);
  assert.match(page, /getLocale/);
  assert.match(page, /getDictionary/);
  assert.match(page, /<LanguageProvider\b(?=[^>]*\blocale=\{locale\})(?=[^>]*\bdict=\{dict\})[^>]*>.*?<PaywallClient\b.*?<\/LanguageProvider>/s);
  assert.match(page, /redirect\("\/login"\)/);
  assert.match(page, /\.from\("payment_slips"\)/);
  assert.match(page, /\.order\(\s*"created_at"\s*,\s*\{\s*ascending:\s*false\s*\}\s*\)/);
  assert.match(client, /<AtelierShell\b/);
  assert.match(client, /<AtelierCard\b/);
  assert.match(client, /<BananaGuide\s+pose=\{guidePose\}/);
  assert.match(client, /BananaGuidePose/);
  assert.match(client, /initialIsPro\s*\|\|\s*promoSuccess.*?"celebrate"/s);
  assert.match(client, /pendingSlip\?\.status\s*===\s*"pending".*?"waiting"/s);
  assert.match(client, /pendingSlip\?\.status\s*===\s*"rejected".*?"retry"/s);
  assert.match(client, /https:\/\/promptpay\.io\/\$\{promptPayId\}\/\$\{amount\}\.png/);
  assert.match(client, /selectedPlan === "yearly" \? 399 : 39/);
  assert.match(client, /\.from\("payment-slips"\)/);
  assert.match(client, /submitPaymentSlip\(selectedPlan, storagePath\)/);
  assert.match(client, /redeemPromoCode\(promoCode\)/);
  assert.match(client, /status === "pending"/);
  assert.match(client, /status === "rejected"/);
  assert.match(actions, /api\.telegram\.org\/bot\$\{botToken\}\/sendPhoto/);
  assert.match(actions, /plan_type:\s*"lifetime"/);
});
