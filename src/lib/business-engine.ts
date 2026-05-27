import { CANONICAL_PROMPT, PROSPECT_LEADS } from "@/lib/demo-data";
import type {
  AppState,
  BusinessBlueprint,
  DeliverablePack,
  FounderPrompt,
  FulfillmentJob,
  FulfillmentPhase,
  Order,
  ProfitabilityAssessment,
  SKU,
  SpendEvent,
} from "@/lib/types";

const now = () => new Date().toISOString();

export const DEFAULT_BUYER_REQUEST =
  "Find Shopify brands with checkout friction for a CRO agency targeting DTC apparel.";

const businessCandidates = [
  {
    id: "prospect-packs",
    label: "Evidence-backed prospect packs",
    cueWords: ["prospect", "cro", "agencies", "evidence-backed"],
    baseScore: 48,
    selectedRationale:
      "Selected because it has recurring demand, digital fulfillment, and the strongest margin profile.",
    passedRationale:
      "Viable, but less directly tied to repeatable paid prospect-intelligence demand.",
  },
  {
    id: "audit-briefs",
    label: "Automated conversion audit briefs",
    cueWords: ["audit", "website", "funnel", "conversion"],
    baseScore: 36,
    selectedRationale:
      "Strong fit when the founder prompt asks for site-audit products and CRO diagnostics.",
    passedRationale:
      "Useful product, but the prompt points harder at sellable prospect packs than one-off audits.",
  },
  {
    id: "competitor-swipes",
    label: "Competitive teardown swipe files",
    cueWords: ["competitor", "teardown", "examples", "landing"],
    baseScore: 31,
    selectedRationale:
      "Strong fit when the founder prompt asks for competitive intelligence and swipe-file products.",
    passedRationale:
      "Good content SKU, but weaker purchase urgency than ranked prospect intelligence.",
  },
];

function scoreCandidate(prompt: string, cueWords: string[], baseScore: number) {
  const normalized = prompt.toLowerCase();
  return cueWords.reduce((score, cue) => {
    return normalized.includes(cue) ? score + 18 : score;
  }, baseScore);
}

function generateSkus(): SKU[] {
  return [
    {
      id: "starter",
      name: "Starter",
      description:
        "Test the format on one vertical with ranked accounts and ready angles.",
      includedLeads: 10,
      priceCents: 2900,
      baseCostCents: 1100,
      estimatedCostRangeCents: [1040, 1180],
      targetBuyer: "Solo consultants validating a prospecting format",
    },
    {
      id: "growth",
      name: "Growth Pack",
      description:
        "A week of qualified outbound, sorted by fit with evidence and angles.",
      includedLeads: 40,
      priceCents: 9900,
      baseCostCents: 710,
      estimatedCostRangeCents: [670, 740],
      targetBuyer: "Boutique CRO agencies running outbound weekly",
    },
    {
      id: "scale",
      name: "Scale",
      description:
        "Quarterly prospect fuel for a 2-4 person agency team.",
      includedLeads: 100,
      priceCents: 29900,
      baseCostCents: 9200,
      estimatedCostRangeCents: [8800, 9600],
      targetBuyer: "Agencies scaling a repeatable outbound motion",
    },
  ];
}

export function createFounderPrompt(text = CANONICAL_PROMPT): FounderPrompt {
  return {
    id: "founder-prompt-demo",
    text,
    createdAt: now(),
  };
}

export function generateBusinessBlueprint(
  founderPrompt: FounderPrompt,
): BusinessBlueprint {
  const evaluatedModels = businessCandidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(
        founderPrompt.text,
        candidate.cueWords,
        candidate.baseScore,
      ),
    }))
    .sort((left, right) => right.score - left.score);
  const selectedModel = evaluatedModels[0];

  return {
    id: "pipeline-packs",
    founderPromptId: founderPrompt.id,
    brandName: "Pipeline Packs",
    chosenModel: selectedModel.label,
    modelEvaluations: evaluatedModels.map((model, index) => ({
      id: model.id,
      label: model.label,
      score: model.score,
      status: index === 0 ? "selected" : "passed",
      rationale: index === 0 ? model.selectedRationale : model.passedRationale,
    })),
    targetCustomerProfile:
      "Boutique CRO agencies that need sharper outbound hooks without adding a research hire.",
    valueProposition:
      "Turn public conversion signals into a paid, client-ready prospect pack with proof, fit rationale, and outreach angles.",
    selectionReasons: [
      "Recurring demand: agencies need fresh outbound intelligence every week.",
      "Digital-only production: the product can be manufactured fast from public signals.",
      "Strong unit economics: ranking and synthesis cost far less than manual research labor.",
    ],
    productStrategy:
      "Sell narrow, outcome-specific packs instead of broad lead databases. Every SKU promises buying context, not just names.",
    pricingLogic:
      "Price by depth of qualification and usefulness to an outbound operator, while keeping the Growth Pack easy to say yes to.",
    marginModel:
      "Accept only when projected gross margin clears 70%; otherwise reprice or reject before checkout opens.",
    marginThreshold: 0.7,
    skus: generateSkus(),
    createdAt: now(),
  };
}

export function assessProfitability(
  sku: SKU,
  requiredGrossMargin: number,
): ProfitabilityAssessment {
  const quotedPriceCents = sku.priceCents;
  const estimatedSpendCents = sku.baseCostCents;
  const projectedGrossMargin =
    (quotedPriceCents - estimatedSpendCents) / quotedPriceCents;
  const minimumViablePrice = Math.ceil(
    estimatedSpendCents / (1 - requiredGrossMargin),
  );

  if (projectedGrossMargin >= requiredGrossMargin) {
    return {
      quotedPriceCents,
      estimatedSpendCents,
      estimatedSpendRangeCents: sku.estimatedCostRangeCents,
      requiredGrossMargin,
      projectedGrossMargin,
      decision: "ACCEPT",
      rationale:
        "The order clears the merchant margin floor with room to spare, so checkout can open.",
    };
  }

  if (minimumViablePrice <= quotedPriceCents * 1.35) {
    return {
      quotedPriceCents,
      estimatedSpendCents,
      estimatedSpendRangeCents: sku.estimatedCostRangeCents,
      requiredGrossMargin,
      projectedGrossMargin,
      decision: "REPRICE",
      recommendedPriceCents: minimumViablePrice,
      rationale:
        "The order is valid, but the quote needs to rise before the agent should accept it.",
    };
  }

  return {
    quotedPriceCents,
    estimatedSpendCents,
    estimatedSpendRangeCents: sku.estimatedCostRangeCents,
    requiredGrossMargin,
    projectedGrossMargin,
    decision: "REJECT",
    rationale:
      "Expected spend consumes too much of the quote. The merchant protects margin and declines the order.",
  };
}

export function createMarginStressTestScenario() {
  const sku: SKU = {
    id: "deep-custom-pack",
    name: "Deep Custom Pack",
    description:
      "A labor-heavier pack with bespoke segmentation and deeper synthesis.",
    includedLeads: 18,
    priceCents: 1100,
    baseCostCents: 420,
    estimatedCostRangeCents: [400, 480],
    targetBuyer: "Agencies asking for more custom research than the core SKU allows",
  };

  return {
    sku,
    assessment: assessProfitability(sku, 0.7),
  };
}

export function createOrder(
  business: BusinessBlueprint,
  sku: SKU,
  customerEmail: string,
): Order {
  const assessment = assessProfitability(sku, business.marginThreshold);

  return {
    id: "growth-order-demo",
    businessId: business.id,
    skuId: sku.id,
    quotedPriceCents: sku.priceCents,
    customerEmail,
    status: "assessed",
    assessment,
    createdAt: now(),
  };
}

export function createFulfillmentJob(orderId: string): FulfillmentJob {
  const phases: FulfillmentPhase[] = [
    {
      id: "discover",
      label: "Prospect discovery",
      description: "Acquire candidate companies that match the chosen buyer profile.",
      status: "pending",
    },
    {
      id: "extract",
      label: "Public-signal extraction",
      description: "Capture open-web proof about offers, pages, and conversion friction.",
      status: "pending",
    },
    {
      id: "qualify",
      label: "Website qualification",
      description: "Rank urgency, ICP fit, and odds of a meaningful CRO angle.",
      status: "pending",
    },
    {
      id: "infer",
      label: "Pain-point inference",
      description: "Convert observed friction into specific commercial hypotheses.",
      status: "pending",
    },
    {
      id: "angles",
      label: "Outreach angle generation",
      description: "Package the ranked leads into buyer-ready outbound angles.",
      status: "pending",
    },
  ];

  return {
    id: "fulfillment-demo",
    orderId,
    status: "queued",
    phases,
    spendEvents: [],
    currentPhaseIndex: -1,
  };
}

function phaseSpend(phaseId: string): SpendEvent | undefined {
  const spendMap: Record<string, Omit<SpendEvent, "id" | "createdAt">> = {
    discover: {
      label: "Search",
      provider: "Discovery index",
      amountCents: 180,
      phaseId,
    },
    extract: {
      label: "Scrape",
      provider: "Signal extraction",
      amountCents: 270,
      phaseId,
    },
    angles: {
      label: "Synthesis",
      provider: "Reasoning stack",
      amountCents: 220,
      phaseId,
    },
  };

  const entry = spendMap[phaseId];
  return entry
    ? {
        id: `spend-${phaseId}`,
        ...entry,
        createdAt: now(),
      }
    : undefined;
}

export function advanceFulfillmentJob(job: FulfillmentJob): FulfillmentJob {
  if (job.status === "completed") {
    return job;
  }

  const phases = job.phases.map((phase) => ({ ...phase }));
  const spendEvents = [...job.spendEvents];

  if (job.currentPhaseIndex >= 0) {
    phases[job.currentPhaseIndex].status = "completed";
    const spend = phaseSpend(phases[job.currentPhaseIndex].id);
    if (spend && !spendEvents.some((entry) => entry.id === spend.id)) {
      spendEvents.push(spend);
    }
  }

  const nextPhaseIndex = job.currentPhaseIndex + 1;
  if (nextPhaseIndex < phases.length) {
    phases[nextPhaseIndex].status = "running";
    return {
      ...job,
      status: "running",
      phases,
      spendEvents,
      currentPhaseIndex: nextPhaseIndex,
      startedAt: job.startedAt ?? now(),
    };
  }

  const deliverablePack = createDeliverablePack();
  return {
    ...job,
    status: "completed",
    phases,
    spendEvents,
    currentPhaseIndex: phases.length - 1,
    completedAt: now(),
    deliverablePack,
  };
}

export function createDeliverablePack(): DeliverablePack {
  return {
    id: "pipeline-growth-pack-demo",
    title: "Pipeline Packs — Growth Pack",
    subtitle:
      "10 preview rows from the 40-account Growth Pack for boutique CRO agencies",
    clientSummary:
      "This paid pack prioritizes brands with visible conversion friction, enough commercial signal to personalize outreach, and a clean consulting wedge for CRO operators.",
    leads: PROSPECT_LEADS,
    createdAt: now(),
    csvFilename: "pipeline-packs-growth-pack.csv",
  };
}

export function calculateTotalSpend(spendEvents: SpendEvent[]) {
  return spendEvents.reduce((total, spend) => total + spend.amountCents, 0);
}

export function calculateGrossMargin(
  revenueCents: number,
  spendEvents: SpendEvent[],
) {
  const spend = calculateTotalSpend(spendEvents);
  if (revenueCents === 0) {
    return 0;
  }
  return (revenueCents - spend) / revenueCents;
}

export function createInitialState(): AppState {
  return {
    founderPrompt: createFounderPrompt(),
    buyerRequest: DEFAULT_BUYER_REQUEST,
    resilienceTestMode: "normal",
    wallet: {
      startingBalanceCents: 4200,
      availableBalanceCents: 4200,
      reservedCents: 0,
      creditedTodayCents: 0,
      spentTodayCents: 0,
    },
    checkoutMode: "demo",
  };
}
