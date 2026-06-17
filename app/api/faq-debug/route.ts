import { NextResponse } from "next/server";
import { getFaqRows, clearCache } from "@/lib/sheet";

// GET /api/faq-debug          — แสดง FAQ ทุก row ที่บอทใช้อยู่
// GET /api/faq-debug?refresh  — force-fetch ใหม่จาก Sheet ทันที
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.has("refresh");

  try {
    if (forceRefresh) clearCache();
    const rows = await getFaqRows();

    return NextResponse.json({
      ok: true,
      refreshed: forceRefresh,
      totalRows: rows.length,
      sheetUrl: process.env.SHEET_CSV_URL ?? "NOT SET",
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
