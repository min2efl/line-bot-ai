import { messagingApi } from "@line/bot-sdk";

const HANDOFF_TRIGGERS = [
  "คุยกับคน",
  "ขอแอดมิน",
  "ขอ counselor",
  "คุยกับ counselor",
  "ขอเจ้าของ",
  "ร้องเรียน",
  "ไม่พอใจ",
  "ส่วนลด",
  "ต่อราคา",
  "ราคาพิเศษ",
  "ติดต่อสื่อ",
  "interview",
];

export function shouldHandoff(message: string): boolean {
  const lower = message.toLowerCase();
  return HANDOFF_TRIGGERS.some((trigger) => lower.includes(trigger));
}

const pushClient = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

export async function notifyAdmin(userId: string, userMessage: string) {
  const adminGroupId = process.env.ADMIN_GROUP_ID;
  if (!adminGroupId) {
    console.warn("[handoff] ADMIN_GROUP_ID not set · skipping admin notify");
    return;
  }

  await pushClient.pushMessage({
    to: adminGroupId,
    messages: [
      {
        type: "text",
        text: `🔔 ลูกค้าต้องการคุยกับ Counselor\n\nUserID: ${userId}\nข้อความ: ${userMessage}\n\nไปตอบที่: https://manager.line.biz/chats`,
      },
    ],
  });
}
