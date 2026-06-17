import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

// GET /api/gemini-test — ทดสอบทุก model หาตัวที่ใช้ได้
export async function GET() {
  const results: Record<string, string> = {};

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        config: { temperature: 1.0, maxOutputTokens: 50 },
        contents: "ตอบว่า OK",
      });
      results[model] = response.text?.trim() ?? "(empty)";
    } catch (err) {
      const msg = (err as Error).message;
      const quota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      results[model] = quota ? "❌ QUOTA_EXCEEDED" : `❌ ${msg.slice(0, 120)}`;
    }
  }

  const working = Object.entries(results).find(([, v]) => !v.startsWith("❌"));

  return NextResponse.json({ working: working?.[0] ?? "none", results });
}
