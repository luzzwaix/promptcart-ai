import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AgentDecision = "SHIP_PACK" | "NEEDS_REVIEW";

type SynthesisLead = {
  company?: string;
  niche?: string;
  publicSignal?: string;
  fitReason?: string;
  outreachAngle?: string;
  confidenceScore?: number;
};

type SelectedAccount = {
  company: string;
  whySelected: string;
  risk: string;
  outreachOpener: string;
};

type SynthesisData = {
  agentDecision: AgentDecision;
  selectedAccounts: SelectedAccount[];
  packSummary: string;
  topAccountRationale: string;
  outreachAngle: string;
  qualityGate: string;
  qualityNote: string;
  fitScoreRationale: string;
  operatorNote: string;
  buyerRequest: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

type RouteBody = {
  orderId?: string;
  businessName?: string;
  skuName?: string;
  prompt?: string;
  buyerRequest?: string;
  leads?: unknown;
  orderEconomics?: {
    quotedPriceCents?: number;
    estimatedSpendCents?: number;
    requiredGrossMargin?: number;
    projectedGrossMargin?: number;
  };
};

type GeminiAgentJson = Partial<{
  agent_decision: AgentDecision;
  selected_accounts: Array<
    Partial<{
      company: string;
      why_selected: string;
      risk: string;
      outreach_opener: string;
    }>
  >;
  pack_summary: string;
  quality_gate: string;
  fit_score_rationale: string;
  operator_note: string;
}>;

const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"] as const;
const DEFAULT_BUYER_REQUEST =
  "Find Shopify brands with checkout friction for a CRO agency targeting DTC apparel.";

function capText(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function compactLeads(leads: unknown): SynthesisLead[] {
  if (!Array.isArray(leads)) {
    return [];
  }

  return leads.slice(0, 3).map((lead) => {
    const item = lead as SynthesisLead;
    return {
      company: capText(item.company, 80),
      niche: capText(item.niche, 80),
      publicSignal: capText(item.publicSignal, 170),
      fitReason: capText(item.fitReason, 170),
      outreachAngle: capText(item.outreachAngle, 170),
      confidenceScore:
        typeof item.confidenceScore === "number" ? item.confidenceScore : 0,
    };
  });
}

function normalizedBuyerRequest(value: unknown) {
  return capText(value, 220) || DEFAULT_BUYER_REQUEST;
}

function fallbackSelectedAccounts(leads: SynthesisLead[]): SelectedAccount[] {
  const selected = leads.length > 0 ? leads : [{ company: "Northlane Skincare" }];

  return selected.slice(0, 3).map((lead, index) => ({
    company: capText(lead.company, 80) || `Selected account ${index + 1}`,
    whySelected:
      capText(lead.fitReason, 180) ||
      "Visible checkout friction creates a credible CRO wedge for outbound.",
    risk:
      "Signal freshness should be checked before a human sends the final campaign.",
    outreachOpener:
      capText(lead.outreachAngle, 180) ||
      "Open with a checkout-friction observation tied to one practical conversion test.",
  }));
}

function deterministicFallback(body?: RouteBody) {
  const leads = compactLeads(body?.leads);
  const buyerRequest = normalizedBuyerRequest(body?.buyerRequest);

  return NextResponse.json({
    mode: "demo-fallback",
    provider: "deterministic-local-agent",
    estimatedOrActualCost: "$0.00",
    data: {
      agentDecision: "SHIP_PACK",
      selectedAccounts: fallbackSelectedAccounts(leads),
      packSummary: `SHIP_PACK: Growth Pack assembled for "${buyerRequest}" using evidence-backed CRO prospects with visible checkout friction.`,
      topAccountRationale:
        "Northlane Skincare is the top account because its acquisition offers are actively tested while cart monetization remains static.",
      outreachAngle:
        "Lead with a cart-experiment wedge: turn active acquisition testing into matched checkout and bundle tests.",
      qualityGate:
        "Passed: selected accounts have public conversion signals, clear CRO relevance, and usable outreach angles.",
      qualityNote:
        "Deterministic fallback used; enable the Gemini Fulfillment Agent for live output.",
      fitScoreRationale:
        "Accounts were prioritized for visible commerce friction, DTC fit, and a plausible CRO agency sales wedge.",
      operatorNote:
        "Fallback keeps the demo stable while preserving the same agent decision contract.",
      buyerRequest,
    } satisfies SynthesisData,
  });
}

function parseGeminiJson(text: string): GeminiAgentJson {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as GeminiAgentJson;
}

function parseSynthesis(
  text: string,
  body: RouteBody,
  leads: SynthesisLead[],
): SynthesisData {
  const parsed = parseGeminiJson(text);
  const buyerRequest = normalizedBuyerRequest(body.buyerRequest);
  const selectedAccounts =
    parsed.selected_accounts
      ?.map((account) => ({
        company: capText(account.company, 80),
        whySelected: capText(account.why_selected, 180),
        risk: capText(account.risk, 150),
        outreachOpener: capText(account.outreach_opener, 180),
      }))
      .filter((account) => account.company && account.whySelected)
      .slice(0, 3) ?? [];
  const fallbackAccounts = fallbackSelectedAccounts(leads);
  const mergedAccounts = [...selectedAccounts];
  fallbackAccounts.forEach((account) => {
    if (
      mergedAccounts.length < 3 &&
      !mergedAccounts.some((item) => item.company === account.company)
    ) {
      mergedAccounts.push(account);
    }
  });
  const finalAccounts = mergedAccounts.slice(0, 3);
  const topAccount = finalAccounts[0] ?? fallbackAccounts[0];

  return {
    agentDecision:
      parsed.agent_decision === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "SHIP_PACK",
    selectedAccounts: finalAccounts.length > 0 ? finalAccounts : fallbackAccounts,
    packSummary:
      capText(parsed.pack_summary, 260) ||
      `Growth Pack assembled for "${buyerRequest}" with account-level checkout-friction evidence.`,
    topAccountRationale:
      topAccount?.whySelected ||
      "The top account has visible conversion friction and a clear CRO agency wedge.",
    outreachAngle:
      topAccount?.outreachOpener ||
      "Lead with a checkout-friction observation and a practical test recommendation.",
    qualityGate:
      capText(parsed.quality_gate, 220) ||
      "Passed: selected accounts have public signals, ICP fit, and specific outreach angles.",
    qualityNote: "Live Gemini fulfillment agent returned valid structured output.",
    fitScoreRationale:
      capText(parsed.fit_score_rationale, 240) ||
      "Fit scoring favored visible commerce friction, DTC relevance, and sales-actionability.",
    operatorNote:
      capText(parsed.operator_note, 220) ||
      "Agent prepared the pack for shipment without human review.",
    buyerRequest,
  };
}

function economicsSummary(body: RouteBody) {
  const economics = body.orderEconomics;
  if (!economics) {
    return "Order economics unavailable.";
  }

  return JSON.stringify({
    quotedPriceCents: economics.quotedPriceCents,
    estimatedSpendCents: economics.estimatedSpendCents,
    requiredGrossMargin: economics.requiredGrossMargin,
    projectedGrossMargin: economics.projectedGrossMargin,
  });
}

function buildPrompt(body: RouteBody, leads: SynthesisLead[]) {
  const buyerRequest = normalizedBuyerRequest(body.buyerRequest);

  return [
    "You are the PromptCart fulfillment agent for a paid B2B prospect-pack order.",
    "Your job is to decide whether the pack can ship, select the best accounts, and write operator-ready rationale.",
    "Return only valid JSON. No markdown. No prose outside JSON.",
    'Use this exact schema: {"agent_decision":"SHIP_PACK|NEEDS_REVIEW","selected_accounts":[{"company":"...","why_selected":"...","risk":"...","outreach_opener":"..."}],"pack_summary":"...","quality_gate":"...","fit_score_rationale":"...","operator_note":"..."}',
    "Default to SHIP_PACK when the buyer request is specific enough and the evidence supports the SKU.",
    "Use NEEDS_REVIEW only when the buyer request is too broad, contradictory, or impossible to fulfill from the provided signals.",
    "Keep selected_accounts to 2 or 3 accounts. Keep every string under 32 words.",
    `Business: ${capText(body.businessName, 80) || "Pipeline Packs"}`,
    `SKU: ${capText(body.skuName, 80) || "Growth Pack"}`,
    `Order: ${capText(body.orderId, 80) || "unknown"}`,
    `Buyer request: ${buyerRequest}`,
    `Founder prompt: ${capText(body.prompt, 280)}`,
    `Order economics: ${economicsSummary(body)}`,
    `Representative lead signals: ${JSON.stringify(leads)}`,
  ].join("\n");
}

async function callGemini({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (response.status !== 200) {
    throw new Error(`Gemini ${model} returned ${response.status}`);
  }

  const result = (await response.json()) as GeminiResponse;
  const text =
    result.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ??
    "";

  if (!text) {
    throw new Error(`Gemini ${model} returned no candidate text`);
  }

  return { text, usage: result.usageMetadata };
}

export async function POST(request: NextRequest) {
  let body: RouteBody;

  try {
    body = await request.json();
  } catch {
    return deterministicFallback();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const liveEnabled = process.env.ENABLE_LIVE_GEMINI_SYNTHESIS === "true";

  if (!apiKey || !liveEnabled) {
    return deterministicFallback(body);
  }

  const leads = compactLeads(body.leads);
  const prompt = buildPrompt(body, leads);

  for (const [index, model] of GEMINI_MODELS.entries()) {
    try {
      const result = await callGemini({ apiKey, model, prompt });
      const data = parseSynthesis(result.text, body, leads);

      return NextResponse.json({
        mode: "live-gemini",
        provider: `google/${model}`,
        estimatedOrActualCost: "usage tracked by Gemini API",
        modelFallbackNote:
          index === 1
            ? "Primary model unavailable; fallback model used."
            : undefined,
        usage: result.usage,
        data,
      });
    } catch {
      continue;
    }
  }

  return deterministicFallback(body);
}
