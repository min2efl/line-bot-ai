import { validateSignature, messagingApi } from "@line/bot-sdk";
import { fetchFAQ } from "@/lib/sheet";
import { generateReply, DEFAULT_REPLY } from "@/lib/gemini";
import { shouldHandoff, notifyAdmin } from "@/lib/handoff";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 10; // Vercel Hobby plan max = 10s

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

async function replyWithRetry(
  replyToken: string,
  text: string,
  attempts: number
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await client.replyMessage({
        replyToken,
        messages: [{ type: "text", text }],
      });
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    log.warn("webhook.invalid_signature");
    return new Response("invalid signature", { status: 401 });
  }

  const { events = [] } = JSON.parse(body);

  await Promise.all(
    events.map(
      async (event: {
        type: string;
        replyToken: string;
        message?: { type: string; text: string };
        source?: { userId?: string };
      }) => {
        if (event.type !== "message" || event.message?.type !== "text") return;

        const userMessage = event.message.text;
        const userId = event.source?.userId ?? "unknown";
        const startTime = Date.now();

        try {
          // 1. Smart Handoff — check before calling Gemini
          if (shouldHandoff(userMessage)) {
            await notifyAdmin(userId, userMessage);
            await replyWithRetry(
              event.replyToken,
              "ขอ Counselor ติดต่อกลับนะคะ 🙏",
              3
            );
            log.info("handoff.routed", {
              userId,
              latencyMs: Date.now() - startTime,
            });
            return;
          }

          // 2. Fetch FAQ (60s cache + stale fallback)
          const faqText = await fetchFAQ();

          // 3. Call Gemini with 8s timeout
          const reply = await Promise.race([
            generateReply(userMessage, faqText),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("gemini_timeout")), 7000)
            ),
          ]).catch((err: Error) => {
            log.error("gemini.failed", { err: err.message, userId });
            return DEFAULT_REPLY;
          });

          // 4. Reply LINE (retry up to 3 times)
          await replyWithRetry(event.replyToken, reply, 3);

          log.info("reply.sent", {
            userId,
            latencyMs: Date.now() - startTime,
            replyLength: reply.length,
          });
        } catch (err) {
          log.error("webhook.error", {
            err: (err as Error).message,
            userId,
          });
          try {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: DEFAULT_REPLY }],
            });
          } catch {
            /* replyToken expired · ignore */
          }
        }
      }
    )
  );

  return new Response("ok", { status: 200 });
}
