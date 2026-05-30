// app/api/roast/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getRoastData, markRoastUsed } from "@/app/actions/roast";
import { getPersona } from "@/app/(dashboard)/roast/_lib/personas";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildUserPrompt(data: import("@/app/actions/roast").RoastData): string {
  const fmt = (n: number) => `฿${n.toLocaleString("th-TH")}`;

  const thisMonthLines = data.thisMonth.length
    ? data.thisMonth.map((c) => `- ${c.category}: ${fmt(c.total)} (${c.count} รายการ)`).join("\n")
    : "- ไม่มีรายการใช้จ่ายเดือนนี้";

  const lastMonthLines = data.lastMonth.length
    ? data.lastMonth.map((c) => `- ${c.category}: ${fmt(c.total)}`).join("\n")
    : "- ไม่มีรายการใช้จ่ายเดือนที่แล้ว";

  const budgetLines = data.budgets.length
    ? data.budgets.map((b) => `- ${b.category}: งบ ${fmt(b.limit_amount)}`).join("\n")
    : "- ไม่ได้ตั้งงบประมาณ";

  return `นี่คือข้อมูลการเงินของผู้ใช้ที่ต้องการให้คุณ roast:

**เดือนนี้ (${data.monthLabel}):**
${thisMonthLines}

**เดือนที่แล้ว (${data.lastMonthLabel}):**
${lastMonthLines}

**งบประมาณที่ตั้งไว้:**
${budgetLines}

กรุณา roast การใช้จ่ายของผู้ใช้อย่างละเอียดและสนุกสนาน วิเคราะห์พฤติกรรม เปรียบเทียบกับเดือนที่แล้ว และดูว่าเกินงบไหม

ตอบในรูปแบบ JSON ต่อไปนี้เท่านั้น ห้ามเพิ่มข้อความอื่น:
{
  "roast": "<roast ยาวๆ ภาษาไทย 300-500 คำ>",
  "quotes": ["<quote สั้นๆ น่าแชร์ 1>", "<quote สั้นๆ น่าแชร์ 2>", "<quote สั้นๆ น่าแชร์ 3>"]
}`;
}

export async function GET(req: NextRequest) {
  try {
    const personaId = req.nextUrl.searchParams.get("persona") ?? "auntie";
    const persona = getPersona(personaId);

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
      messages: [
        { role: "system", content: persona.systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
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
