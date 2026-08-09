import { NextResponse } from "next/server";

// =========================================================
// パスポートOCR（Gemini 3.5 Flash）
//
// クライアントから base64 画像を受け取り、gemini-3.5-flash で
// 氏名・パスポート番号を JSON 抽出して返す。
// APIキーはサーバー側 (GEMINI_API_KEY) でのみ保持し、クライアントには出さない。
// =========================================================

export const runtime = "nodejs";

const MODEL = "gemini-3.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Gemini に返させる JSON の形（structured output）
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    fullName: {
      type: "string",
      description:
        "Passport holder's full name in Latin letters, SURNAME first then given names, e.g. 'YAMADA TARO'. Empty string if not readable.",
    },
    passportNumber: {
      type: "string",
      description:
        "Passport number (alphanumeric, no spaces). Empty string if not readable.",
    },
  },
  required: ["fullName", "passportNumber"],
} as const;

const PROMPT = [
  "You are an OCR engine specialized in passports.",
  "Read this passport image and extract the holder's full name and passport number.",
  "Prefer the machine-readable zone (MRZ, the two lines of '<' at the bottom) when present, as it is the most reliable source.",
  "For the name: use Latin letters only, surname first followed by given names, separated by a single space. Do not include '<' characters.",
  "For the passport number: alphanumeric only, uppercase, no spaces or '<'.",
  "If a field cannot be read confidently, return an empty string for it.",
  "Return only the requested fields.",
].join(" ");

type OcrResult = { fullName: string; passportNumber: string };

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured", fullName: "", passportNumber: "" },
      { status: 500 }
    );
  }

  let imageBase64: string | undefined;
  let mimeType = "image/jpeg";
  try {
    const body = await req.json();
    imageBase64 = body?.imageBase64;
    if (typeof body?.mimeType === "string") mimeType = body.mimeType;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  // "data:image/jpeg;base64,...." 形式で来ても動くように前置きを除去
  const cleaned = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  try {
    const geminiRes = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: cleaned } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error("Gemini OCR error:", geminiRes.status, detail);
      return NextResponse.json(
        { error: "Gemini request failed", fullName: "", passportNumber: "" },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    let parsed: OcrResult = { fullName: "", passportNumber: "" };
    if (text) {
      try {
        const obj = JSON.parse(text);
        parsed = {
          fullName: String(obj.fullName ?? "").trim(),
          passportNumber: String(obj.passportNumber ?? "")
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .trim(),
        };
      } catch {
        console.warn("Gemini returned non-JSON text:", text);
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Gemini OCR exception:", err);
    return NextResponse.json(
      { error: "OCR failed", fullName: "", passportNumber: "" },
      { status: 500 }
    );
  }
}
