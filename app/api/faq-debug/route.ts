import { NextResponse } from "next/server";
import { getFaq } from "@/lib/sheet";

// GET /api/faq-debug — แสดง FAQ ที่บอทกำลังใช้อยู่จริง (test only)
export async function GET() {
  try {
    const faq = await getFaq();
    return NextResponse.json({
      ok: true,
      charCount: faq.length,
      preview: faq.slice(0, 2000),
      sheetUrl: process.env.SHEET_CSV_URL ?? "NOT SET",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
