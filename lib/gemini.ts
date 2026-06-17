import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-2.5-flash"; // update if a newer model is available
const DEFAULT_MESSAGE =
  "ขอโทษค่ะ ยังไม่มีข้อมูลตอบกลับในตอนนี้ รบกวนฝากรายละเอียดเพิ่มเติมไว้ได้เลย พี่แอดมินจะรีบส่งเรื่องให้พี่ Counselor ตอบกลับโดยเร็วที่สุด";

export async function askGemini(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      temperature: 1.0,
      maxOutputTokens: 1024,
    },
    contents: prompt,
  });

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const usageMetadata = response.usageMetadata;

  console.log({
    finishReason,
    thoughtsTokenCount: usageMetadata?.thoughtsTokenCount,
    candidatesTokenCount: usageMetadata?.candidatesTokenCount,
  });

  if (finishReason === "MAX_TOKENS") {
    return DEFAULT_MESSAGE;
  }

  const text = response.text;
  if (!text || !text.trim()) return DEFAULT_MESSAGE;

  return text.trim();
}

export { DEFAULT_MESSAGE };
