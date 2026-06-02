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

  const reviewCatLines = data.thisMonth.length
    ? data.thisMonth.map((c) => `- ${c.category}: ${fmt(c.total)} (${c.count} รายการ)`).join("\n")
    : "- ไม่มีรายการใช้จ่าย";

  const prevCatLines = data.lastMonth.length
    ? data.lastMonth.map((c) => `- ${c.category}: ${fmt(c.total)} (${c.count} รายการ)`).join("\n")
    : "- ไม่มีรายการใช้จ่าย";

  const budgetLines = data.budgets.length
    ? data.budgets.map((b) => `- ${b.category}: งบ ${fmt(b.limit_amount)}`).join("\n")
    : "- ไม่ได้ตั้งงบประมาณ";

  return `Here is the financial data for the monthly review. Write entirely in THAI, matching your persona's tone.

**MONTHLY REVIEW: ${data.monthLabel}**
- Income: ${fmt(data.thisMonthIncome)}
- Savings: ${fmt(data.thisMonthSavings)}
- Saving Rate: ${data.thisMonthSavingRate}%
- Expenses by Category:
${reviewCatLines}
- Budgets set:
${budgetLines}

**PREVIOUS MONTH: ${data.lastMonthLabel}**
- Income: ${fmt(data.lastMonthIncome)}
- Savings: ${fmt(data.lastMonthSavings)}
- Saving Rate: ${data.lastMonthSavingRate}%
- Expenses by Category:
${prevCatLines}

**INSTRUCTIONS:**
1. Language: Write the entire response in THAI (ภาษาไทย).
2. Persona Alignment: Adopt the specific persona from the system prompt. Speak natively like them.
3. Output is ONE seamless paragraph (~200-300 words) covering three parts in natural flow:
   - Stats summary: briefly recap income, savings rate, and top spending categories for ${data.monthLabel}
   - Pinpoint the problem: identify the most glaring issue (overspending category, poor saving rate, worse than previous month, etc.)
   - Suggestion: give one practical, playful piece of advice
4. STRICT RULES: NO section headers, NO bold labels, NO "suggestion:", NO "summary:", NO "Part 1:" — the three parts must flow as one natural paragraph.
5. Compliment if saving rate >= 15% or significantly improved vs previous month — mix praise with the roast.
6. Return valid JSON (no markdown code blocks):
{
  "roast": "<One seamless paragraph in Thai, ~200-300 words, no headers>",
  "summary": "<Exactly 1 punchy sentence in Thai capturing the essence. Used for sharing.>"
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
      model: "gpt-4.5-nano",
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
            if (parsed.roast && typeof parsed.summary === "string") {
              await supabase.from("ai_roasts").insert({
                user_id: user.id,
                persona_id: personaId,
                roast: parsed.roast,
                summary: parsed.summary,
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
