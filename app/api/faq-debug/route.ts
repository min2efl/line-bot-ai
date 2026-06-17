import { NextResponse } from "next/server";
import { getFaq, clearCache } from "@/lib/sheet";

// GET /api/faq-debug        — แสดง FAQ ที่บอทใช้อยู่
// GET /api/faq-debug?refresh — force-fetch ใหม่จาก Sheet ทันที
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.has("refresh");

  try {
    if (forceRefresh) clearCache();
    const faq = await getFaq();
    return NextResponse.json({
      ok: true,
      refreshed: forceRefresh,
      charCount: faq.length,
      preview: faq.slice(0, 3000),
      sheetUrl: process.env.SHEET_CSV_URL ?? "NOT SET",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
