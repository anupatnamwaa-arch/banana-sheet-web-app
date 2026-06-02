// app/api/roast/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getRoastData, markRoastUsed } from "@/app/actions/roast";
import { getPersona } from "@/app/(dashboard)/roast/_lib/personas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildUserPrompt(data: import("@/app/actions/roast").RoastData): string {
  const fmt = (n: number) => `฿${n.toLocaleString("th-TH")}`;

  const thisMonthLines = data.thisMonth.length
    ? data.thisMonth.map((c) => `- ${c.category}: ${fmt(c.total)} (${c.count} รายการ)`).join("\n")
    : "- ไม่มีรายการใช้จ่ายเดือนนี้";

  const budgetLines = data.budgets.length
    ? data.budgets.map((b) => `- ${b.category}: งบ ${fmt(b.limit_amount)}`).join("\n")
    : "- ไม่ได้ตั้งงบประมาณ";

  return `Here is the financial data of the user you need to roast. Please write your roast entirely in THAI, matching your persona's tone.

**THIS MONTH DATA (${data.monthLabel}):**
- Income: ${fmt(data.thisMonthIncome)}
- Savings: ${fmt(data.thisMonthSavings)}
- Saving Rate: ${data.thisMonthSavingRate}%
- Expenses by Category:
${thisMonthLines}
- Budgets set:
${budgetLines}

**LAST MONTH SUMMARY (${data.lastMonthLabel}):**
- Total Income: ${fmt(data.lastMonthIncome)}
- Total Expense: ${fmt(data.lastMonthExpense)}
- Total Savings: ${fmt(data.lastMonthSavings)}
- Saving Rate: ${data.lastMonthSavingRate}%

**INSTRUCTIONS & GUIDELINES FOR THE ROAST:**
1. Language: Write the entire response in THAI (ภาษาไทย).
2. Persona Alignment: You must adopt the specific persona requested in the system prompt. Speak natively like them.
3. Structured Flow: Your roast must cover four parts in order:
   - Part 1: Introduction (a witty, sarcastic hook targeting the user's overall behavior)
   - Part 2: Summary Result (a summary of their income, total expenses, and savings rate)
   - Part 3: Discussion (a breakdown of category spending, whether they blew past budgets, and a comparison against last month's performance)
   - Part 4: Suggestions (playful, practical advice for improvement)
4. STRICT RULES FOR HEADERS: DO NOT include any explicit section titles, bold headers, or labels like "Introduction:", "Summary:", "Discussion:", "Suggestion:", "Part 1:", "คำแนะนำ:", or similar. The four parts must flow naturally and seamlessly as a unified, storytelling narrative.
5. Complimentary Clause: If the user is doing good financially (e.g., they saved a decent portion of their income with a saving rate >= 15%, stayed within overall budgets, or significantly reduced expenses compared to last month), you MUST give them sincere but playful compliments alongside your roasts. Do not just criticize; praise them when they deserve it!
6. Return format: You must return the output as a valid JSON object matching the following structure. Do not wrap the JSON block in markdown code blocks:
{
  "roast": "<Write the full structured roast here in Thai, about 300-500 words, formatted in paragraphs using newlines where appropriate>",
  "quotes": [
    "<Sassy short quote 1 in Thai, suitable for sharing>",
    "<Sassy short quote 2 in Thai, suitable for sharing>",
    "<Sassy short quote 3 in Thai, suitable for sharing>"
  ]
}`;
}

export async function GET(req: NextRequest) {
  try {
    const personaId = req.nextUrl.searchParams.get("persona") ?? "auntie";
    const persona = getPersona(personaId);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch and check rate limit
    const result = await getRoastData();
    if (!result.allowed) {
      return new Response(JSON.stringify({ error: result.reason }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mark roast as used server-side before streaming starts
    await markRoastUsed();

    const userPrompt = buildUserPrompt(result.data);

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: persona.systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = "";
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              accumulated += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Persist the generated roast in the background once the stream completes
          try {
            const parsed = JSON.parse(accumulated);
            if (parsed.roast && Array.isArray(parsed.quotes)) {
              await supabase.from("ai_roasts").insert({
                user_id: user.id,
                persona_id: personaId,
                roast: parsed.roast,
                quotes: parsed.quotes.slice(0, 2), // Keep exactly 2 quotes
              });
            }
          } catch (dbErr) {
            console.error("Failed to parse and save generated roast:", dbErr);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
