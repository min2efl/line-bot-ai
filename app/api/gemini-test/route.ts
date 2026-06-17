import { NextResponse } from "next/server";
import { getFaq } from "@/lib/sheet";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// GET /api/gemini-test?q=คำถาม — ทดสอบ Gemini โดยตรง
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const question = searchParams.get("q") ?? "สวัสดี";

  try {
    const faq = await getFaq();

    const prompt = `<faq>\n${faq}\n</faq>\n\n<question>\n${question}\n</question>`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      config: { temperature: 1.0, maxOutputTokens: 1024 },
      contents: prompt,
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    const usage = response.usageMetadata;
    const text = response.text;

    return NextResponse.json({
      ok: true,
      question,
      finishReason,
      text,
      usage: {
        thoughtsTokenCount: usage?.thoughtsTokenCount ?? 0,
        candidatesTokenCount: usage?.candidatesTokenCount ?? 0,
        totalTokenCount: usage?.totalTokenCount ?? 0,
      },
      faqCharCount: faq.length,
      promptCharCount: prompt.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
