// app/api/telegram/webhook/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  // 1. Authenticate request using secret token if configured
  const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  try {
    const payload = await request.json();

    // We only process callback queries (taps on inline buttons)
    if (!payload.callback_query) {
      return NextResponse.json({ ok: true, message: "Ignored non-callback update" });
    }

    const { id: callbackQueryId, data: callbackData, message } = payload.callback_query;
    if (!callbackData || !message) {
      return NextResponse.json({ ok: true });
    }

    const parts = callbackData.split(":");
    const action = parts[0]; // "approve" or "reject"

    const serviceSupabase = createServiceClient();

    if (action === "approve") {
      const planType = parts[1] as "yearly" | "monthly";
      const slipId = parts[2];

      // Retrieve slip details to find user_id
      const { data: slip, error: slipErr } = await serviceSupabase
        .from("payment_slips")
        .select("user_id, image_url")
        .eq("id", slipId)
        .single();

      if (slipErr || !slip) {
        await answerCallback(botToken, callbackQueryId, `❌ Slip not found: ${slipErr?.message || "Unknown"}`);
        return NextResponse.json({ ok: true });
      }

      // Calculate expiration date
      const days = planType === "yearly" ? 365 : 30;
      const planExpiresAt = new Date();
      planExpiresAt.setDate(planExpiresAt.getDate() + days);

      // Update profile
      const { error: profileErr } = await serviceSupabase
        .from("profiles")
        .update({
          is_active: true,
          plan_type: planType,
          plan_expires_at: planExpiresAt.toISOString(),
        })
        .eq("id", slip.user_id);

      if (profileErr) {
        await answerCallback(botToken, callbackQueryId, `❌ Failed to update profile: ${profileErr.message}`);
        return NextResponse.json({ ok: true });
      }

      // Update slip status to verified
      await serviceSupabase
        .from("payment_slips")
        .update({ status: "verified" })
        .eq("id", slipId);

      // Confirm to Telegram owner
      await answerCallback(botToken, callbackQueryId, `✅ Approved ${planType.toUpperCase()} successfully!`);

      // Edit the caption of the Telegram message to show it is approved
      const updatedCaption = `${message.caption || ""}\n\n` +
        `🟢 **STATUS: APPROVED**\n` +
        `📅 **Expires At:** ${planExpiresAt.toLocaleDateString("en-GB")}\n` +
        `👤 **Approver ID:** Telegram Bot`;

      await editCaption(botToken, message.chat.id, message.message_id, updatedCaption);

    } else if (action === "reject") {
      const slipId = parts[1];

      // Update slip status to rejected
      const { error: slipErr } = await serviceSupabase
        .from("payment_slips")
        .update({ status: "rejected" })
        .eq("id", slipId);

      if (slipErr) {
        await answerCallback(botToken, callbackQueryId, `❌ Rejection failed: ${slipErr.message}`);
        return NextResponse.json({ ok: true });
      }

      // Confirm to Telegram owner
      await answerCallback(botToken, callbackQueryId, `❌ Payment slip rejected.`);

      // Edit message caption to show rejected status
      const updatedCaption = `${message.caption || ""}\n\n` +
        `🔴 **STATUS: REJECTED**\n` +
        `❌ User request has been denied.`;

      await editCaption(botToken, message.chat.id, message.message_id, updatedCaption);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Helper: Answer Telegram callback query toast alert */
async function answerCallback(botToken: string, callbackQueryId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: true,
      }),
    });
  } catch (e) {
    console.error("answerCallback error:", e);
  }
}

/** Helper: Update the Telegram photo message caption to show final decision status */
async function editCaption(botToken: string, chatId: number, messageId: number, newCaption: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: newCaption,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    console.error("editCaption error:", e);
  }
}
