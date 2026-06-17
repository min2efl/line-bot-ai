import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt } from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-2.5-flash";

export const DEFAULT_REPLY =
  "ขอโทษค่ะ ยังไม่มีข้อมูลตอบกลับในตอนนี้ รบกวนฝากรายละเอียดเพิ่มเติมไว้ได้เลย พี่แอดมินจะรีบส่งเรื่องให้พี่ Counselor ตอบกลับโดยเร็วที่สุด";

export async function generateReply(
  userMessage: string,
  faqText: string
): Promise<string> {
  const startTime = Date.now();
  const systemPrompt = buildSystemPrompt(faqText, DEFAULT_REPLY);

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction: systemPrompt,
      temperature: 1.0,
      maxOutputTokens: 1024,
    },
    contents: userMessage,
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  const usage = response.usageMetadata;

  console.log(
    JSON.stringify({
      event: "gemini.reply",
      latencyMs: Date.now() - startTime,
      finishReason,
      thoughtsTokenCount: usage?.thoughtsTokenCount ?? 0,
      candidatesTokenCount: usage?.candidatesTokenCount ?? 0,
      totalTokenCount: usage?.totalTokenCount ?? 0,
    })
  );

  if (finishReason === "MAX_TOKENS") {
    console.warn("[gemini] truncated · returning default reply");
    return DEFAULT_REPLY;
  }

  const reply = response.text?.trim();
  if (!reply) throw new Error("gemini_empty_response");

  return reply;
}
