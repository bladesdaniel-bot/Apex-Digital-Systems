import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { EXPENSE_CATEGORIES } from "./expenses";

export type ReceiptScan = { vendor: string; amount: number; expense_date: string; category: string; description: string; allocation: "general" | "project"; project: string };

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";
function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return response;
  };
}

/** Reads a receipt/invoice screenshot with an AI vision model and returns suggested expense fields. */
export async function scanReceipt(image: { base64: string; type: string }, knownProjects: string[]): Promise<ReceiptScan> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: `You read business receipts and invoices for a small digital agency. Reply with JSON only, no prose: {"vendor": string, "amount": number (grand total paid in USD, no symbols), "expense_date": "YYYY-MM-DD" or "" if unreadable, "category": one of ${JSON.stringify(EXPENSE_CATEGORIES)}, "description": short summary of what was bought, "allocation": "general" or "project", "project": string}. Use "project" only if the receipt clearly relates to one of these apps/projects: ${JSON.stringify(knownProjects)}; otherwise "general" with project "". Never invent numbers; use 0 if the total is unreadable.`,
    messages: [{ role: "user", content: [{ type: "text", text: "Extract this receipt as JSON." }, { type: "image", image: image.base64, mediaType: image.type }] }],
    onError: ({ error }) => { failure = error; },
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  let text = "";
  for await (const chunk of result.textStream) text += chunk;
  if (failure || !text) {
    const msg = String((failure as any)?.statusCode ?? "");
    if (msg === "429") throw new Error("The scanner is busy. Try again in a minute.");
    if (msg === "402") throw new Error("AI credits are used up. Add credits, or enter the expense by hand.");
    throw new Error("Couldn't read this receipt. Enter it by hand.");
  }
  let p: any = {};
  try { p = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { /* defaults below */ }
  const amount = Number(p.amount);
  return {
    vendor: String(p.vendor ?? "").slice(0, 200),
    amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0,
    expense_date: /^\d{4}-\d{2}-\d{2}$/.test(p.expense_date ?? "") ? p.expense_date : "",
    category: (EXPENSE_CATEGORIES as readonly string[]).includes(p.category) ? p.category : "Other",
    description: String(p.description ?? "").slice(0, 500),
    allocation: p.allocation === "project" && p.project ? "project" : "general",
    project: p.allocation === "project" ? String(p.project ?? "").slice(0, 120) : "",
  };
}
