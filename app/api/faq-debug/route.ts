import { NextResponse } from "next/server";
import { getFaqRows, fetchCsv, clearCache } from "@/lib/sheet";

// GET /api/faq-debug          — แสดง FAQ ทุก row + raw CSV
// GET /api/faq-debug?refresh  — force-fetch ใหม่จาก Sheet ทันที
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.has("refresh");

  try {
    if (forceRefresh) clearCache();

    const rawCsv = await fetchCsv();
    const rows = await getFaqRows();

    // split raw CSV into lines to diagnose extra rows
    const csvLines = rawCsv.split("\n");

    return NextResponse.json({
      ok: true,
      refreshed: forceRefresh,
      totalRows: rows.length,
      rawCsvTotalLines: csvLines.length,
      rawCsvLines: csvLines,   // raw CSV ทุกบรรทัด — ดูว่ามีบรรทัดแปลกไหม
      rows,                    // parsed FAQ rows
      sheetUrl: process.env.SHEET_CSV_URL ?? "NOT SET",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
