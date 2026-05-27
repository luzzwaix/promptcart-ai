export type MarginDecision = "ACCEPT" | "REPRICE" | "REJECT";

export type CheckoutMode = "demo" | "live";

export type ResilienceTestMode =
  | "normal"
  | "primary-failure"
  | "malformed-json"
  | "no-api-key";

export interface FounderPrompt {
  id: string;
  text: string;
  createdAt: string;
}

export interface SKU {
  id: string;
  name: string;
  description: string;
  includedLeads: number;
  priceCents: number;
  baseCostCents: number;
  estimatedCostRangeCents: [number, number];
  targetBuyer: string;
}

export interface BusinessModelEvaluation {
  id: string;
  label: string;
  score: number;
  status: "selected" | "passed";
  rationale: string;
}

export interface BusinessBlueprint {
  id: string;
  founderPromptId: string;
  brandName: string;
  chosenModel: string;
  modelEvaluations: BusinessModelEvaluation[];
  targetCustomerProfile: string;
  valueProposition: string;
  selectionReasons: string[];
  productStrategy: string;
  pricingLogic: string;
  marginModel: string;
  marginThreshold: number;
  skus: SKU[];
  createdAt: string;
}

export interface ProfitabilityAssessment {
  quotedPriceCents: number;
  estimatedSpendCents: number;
  estimatedSpendRangeCents: [number, number];
  requiredGrossMargin: number;
  projectedGrossMargin: number;
  decision: MarginDecision;
  recommendedPriceCents?: number;
  rationale: string;
}

export interface CheckoutSession {
  id: string;
  orderId: string;
  mode: CheckoutMode;
  checkoutUrl?: string;
  createdAt: string;
}

export interface PaymentReceipt {
  id: string;
  sessionId: string;
  orderId: string;
  amountCents: number;
  mode: CheckoutMode;
  paidAt: string;
}

export interface Order {
  id: string;
  businessId: string;
  skuId: string;
  quotedPriceCents: number;
  customerEmail: string;
  status:
    | "draft"
    | "assessed"
    | "accepted"
    | "checkout_ready"
    | "paid"
    | "fulfilling"
    | "delivered"
    | "repriced"
    | "rejected";
  assessment: ProfitabilityAssessment;
  checkoutSession?: CheckoutSession;
  paymentReceipt?: PaymentReceipt;
  acceptedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface SpendEvent {
  id: string;
  label: string;
  provider: string;
  phaseId: string;
  amountCents: number;
  createdAt: string;
}

export interface LocusSynthesisProof {
  mode: "live-gemini" | "demo-fallback";
  provider: string;
  estimatedOrActualCost: string;
  resilienceStatus:
    | "Primary model succeeded"
    | "Fallback model used"
    | "Deterministic fallback preserved delivery";
  resilienceTestMode?: ResilienceTestMode;
  modelFallbackNote?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  data: {
    agentDecision: "SHIP_PACK" | "NEEDS_REVIEW";
    selectedAccounts: Array<{
      company: string;
      whySelected: string;
      risk: string;
      outreachOpener: string;
    }>;
    packSummary: string;
    topAccountRationale: string;
    outreachAngle: string;
    qualityGate: string;
    qualityNote: string;
    fitScoreRationale: string;
    operatorNote: string;
    buyerRequest: string;
  };
}

export interface FulfillmentPhase {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "completed";
}

export interface FulfillmentJob {
  id: string;
  orderId: string;
  status: "queued" | "running" | "completed";
  phases: FulfillmentPhase[];
  spendEvents: SpendEvent[];
  currentPhaseIndex: number;
  startedAt?: string;
  completedAt?: string;
  deliverablePack?: DeliverablePack;
  synthesisProof?: LocusSynthesisProof;
}

export interface ProspectLead {
  id: string;
  company: string;
  niche: string;
  publicSignal: string;
  fitReason: string;
  confidenceScore: number;
  outreachAngle: string;
  priorityRank: number;
}

export interface DeliverablePack {
  id: string;
  title: string;
  subtitle: string;
  clientSummary: string;
  leads: ProspectLead[];
  createdAt: string;
  csvFilename: string;
}

export interface WalletSnapshot {
  startingBalanceCents: number;
  availableBalanceCents: number;
  reservedCents: number;
  creditedTodayCents: number;
  spentTodayCents: number;
}

export interface AppState {
  founderPrompt: FounderPrompt;
  buyerRequest: string;
  resilienceTestMode: ResilienceTestMode;
  business?: BusinessBlueprint;
  selectedSkuId?: string;
  order?: Order;
  fulfillmentJob?: FulfillmentJob;
  wallet: WalletSnapshot;
  checkoutMode: CheckoutMode;
}
