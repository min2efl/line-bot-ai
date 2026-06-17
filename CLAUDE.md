# CLAUDE.md — LINE Bot AI · Education For Life

## What we're building

LINE Official Account bot สำหรับ Education For Life ศูนย์แนะแนวศึกษาต่อต่างประเทศ
ตอบลูกค้า 24 ชม. โดยใช้ Gemini Flash อ่าน FAQ จาก Google Sheet · ส่ง reply กลับ LINE

## Stack — locked

- Next.js 14 App Router + TypeScript
- `@line/bot-sdk` v9 for LINE Messaging API
- `@google/genai` for Gemini 2.5 Flash
- Google Sheet CSV public URL for FAQ
- Vercel for hosting

## Repo layout

```
app/api/line-webhook/route.ts  — POST handler (verify → handoff check → FAQ → Gemini → reply)
lib/sheet.ts                   — fetch + parse + cache CSV (60s TTL + stale fallback)
lib/gemini.ts                  — call Gemini with systemInstruction
lib/prompts.ts                 — buildSystemPrompt (EFL guardrails + reasoning protocol)
lib/handoff.ts                 — Smart Handoff trigger detection + notify admin
lib/log.ts                     — structured JSON logging helper
types/faq.ts                   — FAQ type
```

## Env vars (Vercel)

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `GEMINI_API_KEY`
- `SHEET_CSV_URL` — Google Sheet published as CSV
- `ADMIN_GROUP_ID` — LINE Group ID สำหรับ Smart Handoff (optional)

## Google Sheet format

### 2 columns (ง่าย)
```csv
question,answer
เรียนต่อออสเตรเลียได้ไหม,ได้ค่ะ EFL ให้คำปรึกษา...
```

### 3 columns (แนะนำ)
```csv
category,question,answer
ออสเตรเลีย,เรียนต่อออสเตรเลียได้ไหม,ได้ค่ะ EFL ให้คำปรึกษา...
```

## Don'ts

- ❌ Hardcode token/key — use env vars
- ❌ Skip signature verification — security risk
- ❌ Skip Gemini timeout — webhook must reply within 10s (Vercel maxDuration = 30)
- ❌ Cache FAQ >60s — owner edits Sheet ต้องเห็นผลเร็ว
- ❌ Log full LINE message text — PII risk · log userId + metadata เท่านั้น
