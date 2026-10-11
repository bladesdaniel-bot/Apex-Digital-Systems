import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return response;
  };
}

const INSTRUCTIONS = `You are a senior strategist at Apex Digital Systems, a Reno-based agency offering: Website Launch (from $1,000), Website Redesign (from $1,000), SEO Growth Cleanup ($399), Website Care Plan ($125/mo), Website Growth & Maintenance ($250/mo), Custom App Design & Build (quoted per project), plus paid ads.
Write a concise internal lead brief (under 300 words) in Markdown with these sections:
## Snapshot — likely business type and goals inferred from the URL and note.
## Business age — the year the business was founded and its approximate age. Use any evidence available (e.g. "since 2005" on the site, known company history). If you cannot determine it, say "Unknown — ask on the call" rather than guessing.
## Owner & key people — the owner's name and any key people (managers, founders). Use evidence from the website and Google listing, and your own knowledge of the company. Cite where you found it. If unknown, say "Unknown — ask on the call" rather than guessing.
## Hours of operation — the business hours by day. Use the Google listing hours when provided, otherwise hours posted in the note. If unknown, say "Unknown — confirm on the call".
## Opportunities — 3-5 tailored marketing opportunities, each one line, mapped to an Apex service.
## Recommended package — one package and why.
## Opening line — one friendly sentence for the first outreach.
You cannot browse the site: base insights only on the URL and note, and clearly label assumptions.`;

const AUDIT_INSTRUCTIONS = `You are a senior strategist at Apex Digital Systems, a Reno-based agency offering: Website Launch (from $1,000), Website Redesign (from $1,000), SEO Growth Cleanup ($399), Website Care Plan ($125/mo), Website Growth & Maintenance ($250/mo), Custom App Design & Build (quoted per project), plus paid ads.
You are given a real audit of the prospect's website (pages actually fetched, scripts not executed) and, when present, the business's live Google listing (rating, review count, status, hours). Cite the Google data where relevant — e.g. few reviews or no rating is a reputation gap the agency can fix. Write an internal lead brief (under 400 words) in Markdown:
## Snapshot — what the business does and how the site presents it, based on the audit.
## Business age — the year the business was founded and its approximate age. Look for evidence in the audit (footer copyright years, "established in", "since 19xx", about-page history) and your own knowledge of the company. Cite the evidence. If none exists, say "Unknown — ask on the call" rather than guessing.
## Owner & key people — the owner's name and any key people (managers, founders). Look for evidence in the audit (about/team pages, staff bios, contact page signatures) and your own knowledge of the company. Cite the evidence. If none exists, say "Unknown — ask on the call" rather than guessing.
## Hours of operation — the business hours by day. Use the Google listing hours when provided; otherwise look for hours posted in the audit (footer, contact page, "Mon–Fri 8am–5pm"). Cite the source. If none exists, say "Unknown — confirm on the call".
## What's working — 2-3 things the site already does well (only if evidenced).
## Gaps found — 3-6 concrete findings, each one line, citing the evidence (e.g. "No meta description on homepage") and mapped to the Apex service that fixes it.
## Recommended package — one package and why.
## Opening line — one friendly sentence referencing a specific finding.
Only state facts present in the audit. Some sites load content with JavaScript, so if pages look nearly empty, say findings are limited rather than claiming the site is empty.`;

export async function generateLeadBrief(input: { url: string; note: string; audit?: string }) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured for this project.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createRunIdFetch(),
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: input.audit ? AUDIT_INSTRUCTIONS : INSTRUCTIONS,
    prompt: `Prospect website: ${input.url || "(none provided)"}\nProspect note: ${input.note || "(none provided)"}${input.audit ? `\n\nWEBSITE AUDIT:\n${input.audit.slice(0, 12000)}` : ""}`,
    onError: ({ error }) => { failure = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (failure || !text.trim()) {
    const status = (failure as { statusCode?: number } | undefined)?.statusCode;
    if (status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    if (status === 429) throw new Error("Too many requests right now — please wait a minute and try again.");
    if (status === 403) throw new Error("The AI request was blocked for this workspace.");
    throw new Error("The brief couldn't be generated. Please try again later.");
  }
  return text;
}
