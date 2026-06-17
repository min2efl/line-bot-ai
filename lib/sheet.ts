import type { FAQ } from "@/types/faq";

const CACHE_TTL_MS = 60 * 1000;

let cache: { data: string; timestamp: number } | null = null;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(csv: string): FAQ[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const faqs: FAQ[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length >= 2 && fields[0].trim()) {
      faqs.push({ question: fields[0].trim(), answer: fields[1].trim() });
    }
  }
  return faqs;
}

export function clearCache() {
  cache = null;
}

async function fetchCsv(): Promise<string> {
  const url = process.env.SHEET_CSV_URL;
  if (!url) throw new Error("SHEET_CSV_URL is not configured");

  // append timestamp to bypass Google Sheets CDN cache
  const bustUrl = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
  const res = await fetch(bustUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

export async function getFaqRows(): Promise<FAQ[]> {
  const csv = await fetchCsv();
  return parseCsv(csv);
}

export async function getFaq(): Promise<string> {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const faqs = await getFaqRows();

  const faqString = faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  cache = { data: faqString, timestamp: now };
  return faqString;
}
