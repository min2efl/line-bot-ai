const CACHE_TTL_MS = 60_000;

let cache: { text: string; expiresAt: number } | null = null;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function csvToFaqText(csv: string): string {
  const lines = csv.split("\n").slice(1).filter((l) => l.trim());
  return lines
    .map((line) => {
      const fields = parseCsvLine(line);
      if (fields.length >= 3 && fields[0]) {
        // 3-column format: category, question, answer
        return `[${fields[0]}] ${fields[1]}\n→ ${fields[2]}`;
      } else if (fields.length >= 2 && fields[0]) {
        // 2-column format: question, answer
        return `Q: ${fields[0]}\nA: ${fields[1]}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n\n");
}

export async function fetchFAQ(): Promise<string> {
  const now = Date.now();

  if (cache && cache.expiresAt > now) return cache.text;

  try {
    const url = process.env.SHEET_CSV_URL;
    if (!url) throw new Error("SHEET_CSV_URL not set");

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Sheet fetch ${res.status}`);

    const csv = await res.text();
    const text = csvToFaqText(csv);

    cache = { text, expiresAt: now + CACHE_TTL_MS };
    return text;
  } catch (err) {
    // serve stale cache if available rather than crashing
    if (cache) {
      console.warn("[sheet] fetch failed · serving stale cache", err);
      return cache.text;
    }
    throw err;
  }
}
