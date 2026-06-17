import { NextResponse } from "next/server";

// GET /api/env-check — แสดง 4 ตัวสุดท้ายของ key ที่ Vercel ใช้อยู่จริง
export async function GET() {
  const key = process.env.GEMINI_API_KEY ?? "";
  return NextResponse.json({
    keySet: key.length > 0,
    keyLength: key.length,
    keyLast4: key.length >= 4 ? `...${key.slice(-4)}` : "(too short)",
    sheetUrlSet: !!process.env.SHEET_CSV_URL,
    lineTokenSet: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });
}
