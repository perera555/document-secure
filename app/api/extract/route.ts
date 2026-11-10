import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractionSchema } from "@/lib/extract-types";

export const maxDuration = 120;

const SYSTEM = `You read scanned personal documents for a private family document vault (users are often in Sri Lanka, so expect NIC numbers, Sinhala/Tamil text, and names written with initials like "P R Perera").
Extract the owner of the document and every useful detail. Transcribe text faithfully; never invent values — use an empty string when something is not present.
Dates must be YYYY-MM-DD. For passports, read the MRZ lines too. For medical documents, the owner is the patient.`;

type Page = { data: string; mediaType: string };

export async function GET() {
  return Response.json({
    aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
    accessCodeRequired: Boolean(process.env.APP_ACCESS_CODE),
  });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "AI extraction is not configured on this server." }, { status: 501 });
  }
  const code = process.env.APP_ACCESS_CODE;
  if (code && request.headers.get("x-access-code") !== code) {
    return Response.json({ error: "Wrong or missing access code. Set it in Settings." }, { status: 401 });
  }

  let pages: Page[];
  try {
    const body = (await request.json()) as { pages?: Page[] };
    pages = (body.pages ?? []).slice(0, 10);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (pages.length === 0) return Response.json({ error: "No pages supplied." }, { status: 400 });

  const content: Anthropic.Beta.BetaContentBlockParam[] = pages.map((p) =>
    p.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: p.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: p.data,
          },
        },
  );
  content.push({
    type: "text",
    text: `These ${pages.length} page(s) are one document. Extract its details.`,
  });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ExtractionSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The AI declined to read this document." }, { status: 422 });
    }
    if (!response.parsed_output) {
      return Response.json({ error: "Could not read the document." }, { status: 502 });
    }
    return Response.json({ extraction: response.parsed_output });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests, try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Server API key is invalid." }, { status: 500 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `AI service error: ${err.message}` }, { status: 502 });
    }
    throw err;
  }
}
