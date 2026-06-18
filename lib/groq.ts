import Groq from "groq-sdk";
import { DEFAULT_MESSAGE } from "./gemini";

const MODEL = "llama-3.3-70b-versatile";

export async function askGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return DEFAULT_MESSAGE;
  return text;
}
