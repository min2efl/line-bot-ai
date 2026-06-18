import { NextRequest, NextResponse } from "next/server";
import { validateSignature, messagingApi } from "@line/bot-sdk";
import { getFaq } from "@/lib/sheet";
import { askAI, DEFAULT_MESSAGE } from "@/lib/ai";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

function buildPrompt(faq: string, question: string): string {
  return `<role>
คุณคือ พี่แอดมิน EFL ของ Education For Life ศูนย์แนะแนวศึกษาต่อต่างประเทศ
</role>

<constraints>
ตอบโดยใช้ข้อมูลใน <faq> เท่านั้น

ห้ามแต่งข้อมูลเพิ่มเอง
ห้ามเดาราคา
ห้ามเดาเวลาเปิดปิด
ห้ามเดาที่ตั้ง
ห้ามเดาข้อมูลประเทศ มหาวิทยาลัย หลักสูตร หรือเงื่อนไขต่าง ๆ

ถ้าไม่พบข้อมูลใน FAQ หรือไม่มั่นใจ
ให้ตอบข้อความนี้เท่านั้น:

"ขอโทษค่ะ ยังไม่มีข้อมูลตอบกลับในตอนนี้ รบกวนฝากรายละเอียดเพิ่มเติมไว้ได้เลย พี่แอดมินจะรีบส่งเรื่องให้พี่ Counselor ตอบกลับโดยเร็วที่สุด"

โทนภาษา:
- สุภาพ
- เป็นกันเอง
- ใช้ emoji เล็กน้อย
- ตอบไม่ยาวมาก แต่ได้ใจความ

ความยาวคำตอบ:
1-3 ประโยค
</constraints>

<output_format>
ภาษาไทย
ไม่ใช้ markdown
</output_format>

<faq>
${faq}
</faq>

<question>
${question}
</question>`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { events = [] } = JSON.parse(body);

  await Promise.all(
    events
      .filter(
        (event: { type: string; message?: { type: string } }) =>
          event.type === "message" && event.message?.type === "text"
      )
      .map(
        async (event: {
          replyToken: string;
          message: { text: string };
        }) => {
          const { replyToken } = event;
          const userMessage = event.message.text;

          let replyText = DEFAULT_MESSAGE;

          try {
            const faq = await getFaq();
            const prompt = buildPrompt(faq, userMessage);
            replyText = await askAI(prompt);
          } catch (error) {
            console.error(error);
            replyText = DEFAULT_MESSAGE;
          }

          try {
            await client.replyMessage({
              replyToken,
              messages: [{ type: "text", text: replyText }],
            });
          } catch (error) {
            console.error(error);
          }
        }
      )
  );

  return NextResponse.json({ status: "ok" });
}
