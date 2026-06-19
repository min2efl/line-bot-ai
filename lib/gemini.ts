import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-1.5-flash"; // 1.5-flash free tier = 1,500 req/day
const DEFAULT_MESSAGE =
  "ขอโทษจริงๆ ที่ยังไม่สามารถตอบคำถามของคุณได้ในตอนนี้ค่ะ ทีมงานของเราได้รับข้อความของคุณแล้ว และจะรีบติดต่อกลับโดยเร็วที่สุดเลยค่ะ\nขอบคุณมากสำหรับความอดทนและการรอคอยนะคะ 😊";

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
