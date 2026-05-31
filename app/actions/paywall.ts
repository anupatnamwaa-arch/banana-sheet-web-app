// app/actions/paywall.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Redeem a discount/promo code for instant Pro access.
 * Activates the lifetime plan immediately.
 */
export async function redeemPromoCode(code: string): Promise<{ success: boolean; message: string }> {
  if (!code || !code.trim()) {
    throw new Error("กรุณากรอกโค้ดส่วนลด / Please enter a promo code");
  }

  const cleanCode = code.trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthenticated");
  }

  // Use service client to bypass RLS to check/update promo_codes
  const serviceSupabase = createServiceClient();

  // 1. Fetch promo code
  const { data: promoData, error: promoError } = await serviceSupabase
    .from("promo_codes")
    .select("id, code, is_active, max_uses, used_count")
    .eq("code", cleanCode)
    .single();

  if (promoError || !promoData) {
    throw new Error("โค้ดไม่ถูกต้องหรือไม่มีอยู่จริง / Invalid promo code");
  }

  if (!promoData.is_active) {
    throw new Error("โค้ดนี้ถูกระงับการใช้งานแล้ว / This code is inactive");
  }

  if (promoData.used_count >= promoData.max_uses) {
    throw new Error("โค้ดนี้ถูกใช้งานครบโควตาแล้ว / This code has reached its maximum usage");
  }

  // 2. Increment used count
  const { error: updatePromoErr } = await serviceSupabase
    .from("promo_codes")
    .update({ used_count: promoData.used_count + 1 })
    .eq("id", promoData.id);

  if (updatePromoErr) {
    throw new Error(`Failed to update code count: ${updatePromoErr.message}`);
  }

  // 3. Update user profile to active
  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .update({
      is_active: true,
      plan_type: "lifetime",
      plan_expires_at: null,
      promo_code: cleanCode,
    })
    .eq("id", user.id);

  if (profileError) {
    // Rollback code count if profile update fails
    await serviceSupabase
      .from("promo_codes")
      .update({ used_count: promoData.used_count })
      .eq("id", promoData.id);
    throw new Error(`Failed to activate profile: ${profileError.message}`);
  }

  return { success: true, message: "Activated successfully" };
}

/**
 * Submits a payment slip proof, saves a pending slip record,
 * generates a secure signed URL, and sends an interactive Telegram message.
 */
export async function submitPaymentSlip(
  planType: "yearly" | "monthly",
  storagePath: string
): Promise<{ success: boolean; slipId: string }> {
  if (!storagePath) {
    throw new Error("No file path provided");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthenticated");
  }

  // 1. Get user profile details
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User";
  const userEmail = user.email || "No email";
  const priceLabel = planType === "yearly" ? "฿399" : "฿39";

  // 2. Insert record into payment_slips (status defaults to pending)
  const { data: slipRecord, error: slipError } = await supabase
    .from("payment_slips")
    .insert({
      user_id: user.id,
      image_url: storagePath,
      plan_type: planType,
      status: "pending",
    })
    .select("id")
    .single();

  if (slipError || !slipRecord) {
    throw new Error(`Failed to create slip record: ${slipError?.message || "Unknown error"}`);
  }

  const slipId = slipRecord.id;

  // 3. Generate secure signed URL for the owner to view the slip in Telegram (7 days expiry)
  const { data: urlData, error: signedUrlErr } = await supabase.storage
    .from("payment-slips")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

  if (signedUrlErr || !urlData?.signedUrl) {
    throw new Error(`Failed to create slip access URL: ${signedUrlErr?.message || "Unknown"}`);
  }

  const slipSignedUrl = urlData.signedUrl;

  // 4. Send interactive notification to Telegram Bot Owner
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;

  if (botToken && ownerChatId) {
    try {
      const caption = `🍌 **New payment slip waiting for review!**\n\n` +
        `👤 **User:** ${displayName}\n` +
        `📧 **Email:** ${userEmail}\n` +
        `🆔 **User ID:** \`${user.id}\`\n` +
        `📦 **Plan:** ${planType.toUpperCase()} (${priceLabel})\n` +
        `📄 **Slip ID:** \`${slipId}\`\n\n` +
        `Please verify the transfer slip above and choose an action:`;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ownerChatId,
          photo: slipSignedUrl,
          caption: caption,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Approve Yearly", callback_data: `approve:yearly:${slipId}` },
                { text: "✅ Approve Monthly", callback_data: `approve:monthly:${slipId}` },
              ],
              [
                { text: "❌ Reject", callback_data: `reject:${slipId}` }
              ]
            ]
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to notify Telegram bot:", errorText);
      }
    } catch (telegramErr) {
      // Don't fail the user flow if Telegram fails to dispatch, standard fallback is table edit
      console.error("Telegram bot dispatch error:", telegramErr);
    }
  } else {
    console.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_CHAT_ID is not configured in env variables.");
  }

  return { success: true, slipId };
}
