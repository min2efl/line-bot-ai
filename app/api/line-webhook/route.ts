import { NextRequest, NextResponse } from "next/server";
import { validateSignature, messagingApi } from "@line/bot-sdk";
import { getFaq } from "@/lib/sheet";
import { askAI, DEFAULT_MESSAGE } from "@/lib/ai";
import { getUserData, setWaitingForName, saveNameAndActivate } from "@/lib/state";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

const WELCOME_MESSAGE =
  "สวัสดีค่ะ ขอบคุณที่ติดต่อ Education For Life นะคะ\nเพื่อให้เจ้าหน้าที่ส่งข้อมูลที่ตรงกับความต้องการ ขอทราบข้อมูลดังนี้ค่า\n\n1. วุฒิจบสูงสุด เรียนจบที่สถาบันไหน ปีอะไร\n2. เกรดเฉลี่ย\n3. ประสบการณ์ทำงาน\n4. สาขาวิชาที่สนใจเรียนต่อ\n5. คะแนนภาษาอังกฤษ IELTS/ TOEFL\n6. ปีการศึกษาที่ต้องการเรียนต่อ\n\nขอบคุณค่ะ";

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

"ขอโทษจริงๆ ที่ยังไม่สามารถตอบคำถามของคุณได้ในตอนนี้ค่ะ ทีมงานของเราได้รับข้อความของคุณแล้ว และจะรีบติดต่อกลับโดยเร็วที่สุดเลยค่ะ\nขอบคุณมากสำหรับความอดทนและการรอคอยนะคะ 😊"

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

async function handleFollow(replyToken: string, userId: string): Promise<void> {
  await Promise.all([
    setWaitingForName(userId),
    client.replyMessage({
      replyToken,
      messages: [{ type: "text", text: WELCOME_MESSAGE }],
    }),
  ]);
}

async function handleMessage(
  replyToken: string,
  userId: string,
  userMessage: string
): Promise<void> {
  const userData = await getUserData(userId);

  // ---- สถานะรอชื่อ ----
  if (userData?.state === "WAITING_FOR_NAME") {
    const name = userMessage.trim();
    await Promise.all([
      saveNameAndActivate(userId, name),
      client.replyMessage({
        replyToken,
        messages: [
          {
            type: "text",
            text: `บันทึกข้อมูลเรียบร้อยค่ะน้อง ${name} 😊\n\nมีเรื่องเรียนต่อประเทศไหนที่อยากปรึกษาพี่แอดมิน EFL เป็นพิเศษไหมคะ`,
          },
        ],
      }),
    ]);
    return;
  }

  // ---- แชทปกติ → ส่ง AI ----
  let replyText = DEFAULT_MESSAGE;
  try {
    const faq = await getFaq();
    const prompt = buildPrompt(faq, userMessage);
    replyText = await askAI(prompt);
  } catch (error) {
    console.error("askAI error:", error);
  }

  try {
    await client.replyMessage({
      replyToken,
      messages: [{ type: "text", text: replyText }],
    });
  } catch (error) {
    console.error("replyMessage error:", error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { events = [] } = JSON.parse(body);

  await Promise.all(
    events.map(
      async (event: {
        type: string;
        replyToken?: string;
        source?: { userId?: string };
        message?: { type: string; text?: string };
      }) => {
        const replyToken = event.replyToken ?? "";
        const userId = event.source?.userId ?? "";
        if (!userId) return;

        try {
          if (event.type === "follow") {
            await handleFollow(replyToken, userId);
          } else if (event.type === "message" && event.message?.type === "text") {
            await handleMessage(replyToken, userId, event.message.text ?? "");
          }
        } catch (error) {
          console.error(`event[${event.type}] error:`, error);
        }
      }
    )
  );

  return NextResponse.json({ status: "ok" });
}
