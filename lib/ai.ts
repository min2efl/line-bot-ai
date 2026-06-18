import { askGemini, DEFAULT_MESSAGE } from "./gemini";
import { askGroq } from "./groq";

export async function askAI(prompt: string): Promise<string> {
  try {
    return await askGemini(prompt);
  } catch (geminiErr) {
    console.warn("Gemini failed, trying Groq:", (geminiErr as Error).message.slice(0, 120));

    if (!process.env.GROQ_API_KEY) {
      console.warn("GROQ_API_KEY not set — no fallback available");
      return DEFAULT_MESSAGE;
    }

    try {
      return await askGroq(prompt);
    } catch (groqErr) {
      console.error("Groq fallback failed:", (groqErr as Error).message.slice(0, 120));
      return DEFAULT_MESSAGE;
    }
  }
}

export { DEFAULT_MESSAGE };
