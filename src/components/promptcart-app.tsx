"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Factory,
  FileSpreadsheet,
  Landmark,
  LayoutGrid,
  LoaderCircle,
  Orbit,
  PackageCheck,
  PanelsTopLeft,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Wallet,
} from "lucide-react";
import {
  advanceFulfillmentJob,
  calculateGrossMargin,
  calculateTotalSpend,
  createFulfillmentJob,
  createInitialState,
  createMarginStressTestScenario,
  createOrder,
  DEFAULT_BUYER_REQUEST,
  generateBusinessBlueprint,
} from "@/lib/business-engine";
import { PROSPECT_LEADS } from "@/lib/demo-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  DemoLocusCheckoutGateway,
  DemoLocusWalletClient,
} from "@/lib/locus-adapters";
import { MerchantLoopScene } from "@/components/merchant-loop-scene";
import type {
  AppState,
  DeliverablePack,
  LocusSynthesisProof,
  MarginDecision,
  ResilienceTestMode,
  SKU,
} from "@/lib/types";

const STORAGE_KEY = "marginpilot-ai-demo-state";
const STORAGE_VERSION = 9;
const checkoutGateway = new DemoLocusCheckoutGateway();
const walletClient = new DemoLocusWalletClient();

const PROOF_CHIPS = [
  "Live Gemini Fulfillment Agent",
  "ACCEPT / REPRICE / REJECT profit gate",
  "Model fallback resilience",
  "Buyer-ready Prospect Pack",
  "P&L dashboard",
];

const RESILIENCE_OPTIONS: Array<{
  id: ResilienceTestMode;
  label: string;
  description: string;
}> = [
  {
    id: "normal",
    label: "Normal run",
    description: "Use Gemini Flash Lite as the primary fulfillment model.",
  },
  {
    id: "primary-failure",
    label: "Simulate primary model failure",
    description: "Skip the primary model and verify fallback model continuity.",
  },
  {
    id: "malformed-json",
    label: "Simulate malformed JSON",
    description: "Force schema recovery and route the next run to fallback.",
  },
  {
    id: "no-api-key",
    label: "Simulate no API key",
    description: "Use deterministic local fulfillment to preserve delivery.",
  },
];

function usePersistentPromptCartState() {
  const [state, setState] = useState<AppState>(createInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            version?: number;
            state?: AppState;
          };

          if (parsed.version === STORAGE_VERSION && parsed.state) {
            setState(parsed.state);
          } else {
            setState(createInitialState());
          }
        } catch {
          setState(createInitialState());
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, state }),
      );
    }
  }, [hydrated, state]);

  return { state, setState, hydrated };
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  copy,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-title">
      <div className="section-mark">
        <Icon size={18} />
      </div>
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {copy ? <p className="section-copy">{copy}</p> : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DecisionPill({ decision }: { decision: MarginDecision }) {
  return (
    <span className={`decision-pill decision-${decision.toLowerCase()}`}>
      {decision === "ACCEPT"
        ? "ACCEPT ORDER"
        : decision === "REPRICE"
          ? "REPRICE"
          : "REJECT"}
    </span>
  );
}

function skuById(skus: SKU[] | undefined, skuId: string | undefined) {
  return skus?.find((sku) => sku.id === skuId);
}

function buildCsv(pack: DeliverablePack) {
  const header = [
    "Priority",
    "Company",
    "Niche",
    "Public Signal",
    "Why It Fits",
    "Confidence Score",
    "Recommended Outreach Angle",
  ];
  const rows = pack.leads.map((lead) => [
    lead.priorityRank,
    lead.company,
    lead.niche,
    lead.publicSignal,
    lead.fitReason,
    lead.confidenceScore,
    lead.outreachAngle,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}

function downloadPack(pack: DeliverablePack) {
  const csv = buildCsv(pack);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pack.csvFilename;
  link.click();
  URL.revokeObjectURL(url);
}

function fallbackSynthesisProof(): LocusSynthesisProof {
  return {
    mode: "demo-fallback",
    provider: "deterministic-local-agent",
    estimatedOrActualCost: "$0.00",
    resilienceStatus: "Deterministic fallback preserved delivery",
    resilienceTestMode: "normal",
    data: {
      agentDecision: "SHIP_PACK",
      selectedAccounts: [
        {
          company: "Northlane Skincare",
          whySelected:
            "Acquisition offers are active while cart monetization remains static.",
          risk:
            "Validate the latest campaign page before sending the final outreach.",
          outreachOpener:
            "Saw active offer testing; your checkout could mirror those tests with bundle and cart experiments.",
        },
        {
          company: "Threadline Apparel",
          whySelected:
            "DTC apparel fit with visible product-page friction and CRO-friendly merchandising angles.",
          risk:
            "Inventory seasonality may affect timing.",
          outreachOpener:
            "Lead with a product-page-to-cart friction audit tied to the current apparel drop.",
        },
      ],
      packSummary:
        `SHIP_PACK: Growth Pack assembled for "${DEFAULT_BUYER_REQUEST}" with visible checkout-friction signals and clear outbound hooks.`,
      topAccountRationale:
        "Northlane Skincare leads the pack because its acquisition offers are active while cart monetization remains static.",
      outreachAngle:
        "Lead with a cart-experiment wedge: match acquisition testing with checkout and bundle tests.",
      qualityGate:
        "Passed: selected accounts have public conversion signals, DTC relevance, and actionable CRO outreach angles.",
      qualityNote:
        "Fallback agent preserved demo stability without making a live Gemini call.",
      fitScoreRationale:
        "Accounts were prioritized for visible commerce friction, DTC fit, and a plausible CRO agency sales wedge.",
      operatorNote:
        "Fallback keeps the pack shippable while preserving the same agent decision contract.",
      buyerRequest: DEFAULT_BUYER_REQUEST,
    },
  };
}

export function PromptCartApp() {
  const { state, setState, hydrated } = usePersistentPromptCartState();
  const synthesisRequestStarted = useRef<Set<string>>(new Set());
  const [customerEmail, setCustomerEmail] = useState("buyer@agencylane.com");
  const [busyAction, setBusyAction] = useState<
    "business" | "order" | "checkout" | "payment" | null
  >(null);

  const selectedSku = skuById(state.business?.skus, state.selectedSkuId);
  const spendEvents = state.fulfillmentJob?.spendEvents ?? [];
  const totalSpend = calculateTotalSpend(spendEvents);
  const grossMargin = state.order
    ? calculateGrossMargin(state.order.quotedPriceCents, spendEvents)
    : 0;
  const deliverable = state.fulfillmentJob?.deliverablePack;
  const synthesisProof = state.fulfillmentJob?.synthesisProof;
  const selectedAgentAccounts = synthesisProof?.data.selectedAccounts ?? [];
  const projectedGrossProfit = state.order
    ? state.order.assessment.quotedPriceCents -
      state.order.assessment.estimatedSpendCents
    : 0;
  const realizedGrossProfit = state.order?.paymentReceipt
    ? state.order.paymentReceipt.amountCents - totalSpend
    : 0;
  const averageConfidence = deliverable
    ? Math.round(
        deliverable.leads.reduce(
          (total, lead) => total + lead.confidenceScore,
          0,
        ) / deliverable.leads.length,
      )
    : 0;
  const phaseLabels = new Map(
    state.fulfillmentJob?.phases.map((phase) => [phase.id, phase.label]) ??
      [],
  );
  const marginStressTest = useMemo(
    () => createMarginStressTestScenario(),
    [],
  );
  const deliveryReceipt = useMemo(() => {
    if (!synthesisProof || !state.order?.paymentReceipt) {
      return null;
    }

    return {
      buyerRequest: synthesisProof.data.buyerRequest,
      agentDecision: synthesisProof.data.agentDecision,
      qualityGate: synthesisProof.data.qualityGate,
      provider: synthesisProof.provider,
      resilienceStatus: synthesisProof.resilienceStatus,
      selectedAccounts: synthesisProof.data.selectedAccounts,
      simulatedOrderValue: formatCurrency(state.order.paymentReceipt.amountCents),
      automatedProductionSpend: formatCurrency(totalSpend),
      endingLedger: formatCurrency(state.wallet.availableBalanceCents),
    };
  }, [synthesisProof, state.order, state.wallet.availableBalanceCents, totalSpend]);
  const receiptJson = deliveryReceipt
    ? JSON.stringify(deliveryReceipt, null, 2)
    : "";

  useEffect(() => {
    if (!state.fulfillmentJob || state.fulfillmentJob.status === "completed") {
      return;
    }

    const timer = window.setTimeout(() => {
      setState((current) => {
        if (!current.fulfillmentJob) {
          return current;
        }

        const nextJob = advanceFulfillmentJob(current.fulfillmentJob);
        const orderStatus =
          nextJob.status === "completed" ? "delivered" : "fulfilling";

        return {
          ...current,
          fulfillmentJob: nextJob,
          order: current.order
            ? {
                ...current.order,
                status: orderStatus,
                deliveredAt:
                  nextJob.status === "completed"
                    ? new Date().toISOString()
                    : current.order.deliveredAt,
              }
            : current.order,
        };
      });
    }, 1050);

    return () => window.clearTimeout(timer);
  }, [setState, state.fulfillmentJob]);

  useEffect(() => {
    if (
      state.fulfillmentJob?.status === "completed" &&
      state.wallet.reservedCents > 0
    ) {
      walletClient
        .settleSpend({
          wallet: state.wallet,
          spendEvents: state.fulfillmentJob.spendEvents,
        })
        .then((wallet) => {
          setState((current) => ({
            ...current,
            wallet,
          }));
        });
    }
  }, [setState, state.fulfillmentJob, state.wallet]);

  useEffect(() => {
    const job = state.fulfillmentJob;
    const order = state.order;
    const business = state.business;
    const finalPhase = job?.phases[job.currentPhaseIndex];

    if (
      !job ||
      !order?.paymentReceipt ||
      !business ||
      job.synthesisProof ||
      finalPhase?.id !== "angles" ||
      finalPhase.status !== "running" ||
      synthesisRequestStarted.current.has(`${job.id}-${job.startedAt}`)
    ) {
      return;
    }

    const synthesisRunId = `${job.id}-${job.startedAt}`;
    synthesisRequestStarted.current.add(synthesisRunId);

    fetch("/api/locus/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        businessName: business.brandName,
        skuName:
          business.skus.find((sku) => sku.id === order.skuId)?.name ??
          "Growth Pack",
        prompt: state.founderPrompt.text,
        buyerRequest: state.buyerRequest,
        leads: PROSPECT_LEADS,
        orderEconomics: {
          quotedPriceCents: order.assessment.quotedPriceCents,
          estimatedSpendCents: order.assessment.estimatedSpendCents,
          requiredGrossMargin: order.assessment.requiredGrossMargin,
          projectedGrossMargin: order.assessment.projectedGrossMargin,
        },
        resilienceTestMode: state.resilienceTestMode,
      }),
    })
      .then((response) => response.json() as Promise<LocusSynthesisProof>)
      .catch(() => fallbackSynthesisProof())
      .then((proof) => {
        setState((current) => {
          if (!current.fulfillmentJob || current.fulfillmentJob.id !== job.id) {
            return current;
          }

          return {
            ...current,
            fulfillmentJob: {
              ...current.fulfillmentJob,
              synthesisProof: proof,
            },
            resilienceTestMode: "normal",
          };
        });
      });
  }, [
    setState,
    state.business,
    state.buyerRequest,
    state.founderPrompt.text,
    state.fulfillmentJob,
    state.order,
    state.resilienceTestMode,
  ]);

  const handleFormBusiness = () => {
    setBusyAction("business");
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        business: generateBusinessBlueprint(current.founderPrompt),
        selectedSkuId: "growth",
        order: undefined,
        fulfillmentJob: undefined,
        resilienceTestMode: "normal",
        wallet: {
          startingBalanceCents: 4200,
          availableBalanceCents: 4200,
          reservedCents: 0,
          creditedTodayCents: 0,
          spentTodayCents: 0,
        },
      }));
      setBusyAction(null);
    }, 420);
  };

  const handleStartOrder = () => {
    if (!state.business || !selectedSku) {
      return;
    }

    setBusyAction("order");
    window.setTimeout(() => {
      setState((current) => ({
        ...current,
        order: createOrder(state.business!, selectedSku, customerEmail),
        fulfillmentJob: undefined,
      }));
      setBusyAction(null);
    }, 360);
  };

  const handleMerchantDecision = async () => {
    if (!state.order) {
      return;
    }

    if (state.order.assessment.decision !== "ACCEPT") {
      setState((current) => ({
        ...current,
        order: current.order
          ? {
              ...current.order,
              status:
                current.order.assessment.decision === "REPRICE"
                  ? "repriced"
                  : "rejected",
            }
          : current.order,
      }));
      return;
    }

    setBusyAction("checkout");
    const session = await checkoutGateway.createCheckoutSession({
      order: state.order,
      business: state.business!,
    });

    setState((current) => ({
      ...current,
      order: current.order
        ? {
            ...current.order,
            status: "checkout_ready",
            acceptedAt: new Date().toISOString(),
            checkoutSession: session,
          }
        : current.order,
    }));
    setBusyAction(null);
  };

  const handlePayment = async () => {
    if (!state.order?.checkoutSession) {
      return;
    }

    setBusyAction("payment");
    const receipt = await checkoutGateway.simulateSuccessfulPayment({
      session: state.order.checkoutSession,
      order: state.order,
    });
    const creditedWallet = await walletClient.creditPaymentRevenue({
      wallet: state.wallet,
      receipt,
    });
    const reservedWallet = await walletClient.reserveFulfillmentBudget({
      wallet: creditedWallet,
      assessment: state.order.assessment,
    });

    setState((current) => ({
      ...current,
      wallet: reservedWallet,
      order: current.order
        ? {
            ...current.order,
            status: "paid",
            paymentReceipt: receipt,
          }
        : current.order,
      fulfillmentJob: createFulfillmentJob(state.order!.id),
    }));
    setBusyAction(null);
  };

  const resetDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(createInitialState());
  };

  const phaseCompletion = useMemo(() => {
    const job = state.fulfillmentJob;
    if (!job) {
      return 0;
    }
    const completed = job.phases.filter(
      (phase) => phase.status === "completed",
    ).length;
    return completed / job.phases.length;
  }, [state.fulfillmentJob]);

  if (!hydrated) {
    return (
      <main className="app-shell loading-shell">
        <LoaderCircle className="spin" size={24} />
        <span>Loading MarginPilot AI</span>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brandlockup">
          <div className="brandmark">
            <Orbit size={20} />
          </div>
          <div>
            <p>MarginPilot AI</p>
            <strong>Resilient merchant operations</strong>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="demo-chip">Simulated settlement + live AI fulfillment</span>
          <button className="ghost-button" onClick={resetDemo}>
            <RefreshCw size={16} />
            Reset demo
          </button>
        </div>
      </header>

      <section className="judge-brief panel">
        <div className="judge-brief-layout">
          <div className="judge-brief-main">
            <span>Operator brief</span>
            <h1>AI merchant operations for productized digital services</h1>
            <p>
              MarginPilot evaluates every order, protects margin, runs resilient
              AI fulfillment, and delivers buyer-ready service assets with
              revenue, cost, and margin visible.
            </p>
            <div className="proof-chip-row" aria-label="MarginPilot proof points">
              {PROOF_CHIPS.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          </div>

          <MerchantLoopScene />
        </div>

        <div className="proof-matrix" aria-label="MarginPilot capability matrix">
          <div>
            <span>AI/ML core</span>
            <ul>
              <li>Gemini Fulfillment Agent runs live when configured</li>
              <li>Fallback model and deterministic continuity preserve delivery</li>
              <li>Structured JSON output powers the service receipt</li>
            </ul>
          </div>
          <div>
            <span>Commerce logic</span>
            <ul>
              <li>Profit gate supports ACCEPT / REPRICE / REJECT</li>
              <li>Ledger tracks revenue, production spend, and retained margin</li>
            </ul>
          </div>
          <div>
            <span>Scope</span>
            <ul>
              <li>Settlement is simulated for the hackathon demo</li>
              <li>No real charge or customer revenue is claimed</li>
              <li>Delivery assets are generated for a canonical demo order</li>
            </ul>
          </div>
        </div>

        <div className="judge-watch-path">
          <span>Demo path</span>
          <ol>
            <li>Form the service merchant and review its economics.</li>
            <li>Run the Growth Pack order through the profit gate.</li>
            <li>Trigger simulated settlement and resilient AI fulfillment.</li>
            <li>Inspect the delivery receipt, ledger, and retained margin.</li>
          </ol>
        </div>
      </section>

      <section className="founder-proof-grid">
        <article className="panel founder-proof-panel">
          <SectionTitle
            icon={ShieldCheck}
            eyebrow="Resilience Lab"
            title="Test the next fulfillment run"
            copy="Choose a failure mode before settlement. MarginPilot will still preserve the delivery contract."
          />
          <div className="resilience-stack">
            <div>
              <span>Primary model</span>
              <strong>gemini-2.5-flash-lite</strong>
            </div>
            <div>
              <span>Fallback model</span>
              <strong>gemini-2.5-flash</strong>
            </div>
            <div>
              <span>Continuity fallback</span>
              <strong>deterministic local fulfillment</strong>
            </div>
          </div>
          <div className="resilience-controls">
            {RESILIENCE_OPTIONS.map((option) => (
              <button
                className={
                  state.resilienceTestMode === option.id ? "selected" : ""
                }
                key={option.id}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    resilienceTestMode: option.id,
                  }))
                }
                disabled={!!state.fulfillmentJob && !state.fulfillmentJob.synthesisProof}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel two-part-panel">
          <SectionTitle
            icon={Orbit}
            eyebrow="Operating loop"
            title="Commercial feasibility before fulfillment"
            copy="The system accepts only margin-safe demand, simulates settlement, fulfills with AI, and records the outcome."
          />
          <div className="architecture-steps">
            <div>
              <span>1</span>
              <strong>Request enters</strong>
              <p>Buyer intent is captured before the service asset is produced.</p>
            </div>
            <div>
              <span>2</span>
              <strong>Profit gate decides</strong>
              <p>ACCEPT, REPRICE, or REJECT is computed before settlement opens.</p>
            </div>
            <div>
              <span>3</span>
              <strong>Receipt closes the loop</strong>
              <p>Delivery includes model, resilience, spend, margin, and selected accounts.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="command-grid">
        <article className="panel prompt-panel">
          <SectionTitle
            icon={Sparkles}
            eyebrow="Service brief"
            title="The operator gives intent"
            copy="MarginPilot turns a service brief into sellable SKUs, margin rules, and a fulfillment-ready operating model."
          />

          <label className="field-label" htmlFor="founder-prompt">
            Service brief
          </label>
          <textarea
            id="founder-prompt"
            value={state.founderPrompt.text}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                founderPrompt: {
                  ...current.founderPrompt,
                  text: event.target.value,
                },
              }))
            }
          />

          <button
            className="primary-button"
            onClick={handleFormBusiness}
            disabled={busyAction === "business"}
          >
            {busyAction === "business" ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            {state.business ? "Re-form merchant" : "Form merchant"}
          </button>

          <div className="mini-ledger">
            <Metric
              label="Operating ledger"
              value={formatCurrency(state.wallet.availableBalanceCents)}
            />
            <Metric
              label="Reserved for fulfillment"
              value={formatCurrency(state.wallet.reservedCents)}
              tone="warn"
            />
          </div>
        </article>

        <article className="panel blueprint-panel">
          <SectionTitle
            icon={Building2}
            eyebrow="Service operating model"
            title={state.business?.brandName ?? "Awaiting merchant formation"}
            copy={
              state.business?.valueProposition ??
              "The agent will shape the service offer, publish its catalog, and declare the operating economics."
            }
          />

          {state.business ? (
            <>
              <div className="formation-banner">
                <Target size={18} />
                <div>
                  <span>Merchant birth moment</span>
                  <strong>
                    Formed from one brief: a margin-disciplined service catalog for
                    boutique CRO agencies.
                  </strong>
                </div>
              </div>

              <div className="model-audit">
                <div className="model-audit-head">
                  <span>Model audit</span>
                  <strong>Agent compared 3 business models before launch</strong>
                </div>
                <div className="model-audit-list">
                  {state.business.modelEvaluations.map((model) => (
                    <div
                      className={`model-audit-row model-${model.status}`}
                      key={model.id}
                    >
                      <div>
                        <span>{model.status === "selected" ? "Selected" : "Passed"}</span>
                        <strong>{model.label}</strong>
                        <p>{model.rationale}</p>
                      </div>
                      <em>{model.score}</em>
                    </div>
                  ))}
                </div>
              </div>

              <div className="blueprint-grid">
                <div>
                  <span>Chosen model</span>
                  <strong>{state.business.chosenModel}</strong>
                </div>
                <div>
                  <span>ICP</span>
                  <strong>{state.business.targetCustomerProfile}</strong>
                </div>
                <div>
                  <span>Product strategy</span>
                  <strong>{state.business.productStrategy}</strong>
                </div>
                <div>
                  <span>Pricing logic</span>
                  <strong>{state.business.pricingLogic}</strong>
                </div>
                <div>
                  <span>Margin model</span>
                  <strong>{state.business.marginModel}</strong>
                </div>
              </div>

              <div className="formation-catalog">
                <span>Opening catalog</span>
                <div>
                  {state.business.skus.map((sku) => (
                    <strong key={sku.id}>
                      {sku.name} · {formatCurrency(sku.priceCents)}
                    </strong>
                  ))}
                </div>
              </div>

              <div className="reason-list">
                {state.business.selectionReasons.map((reason) => (
                  <div key={reason}>
                    <BadgeCheck size={16} />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <PanelsTopLeft size={28} />
              <p>
                MarginPilot has the service intent. The merchant blueprint is one
                decisive action away.
              </p>
            </div>
          )}
        </article>

        <aside className="panel operations-rail">
          <SectionTitle
            icon={Store}
            eyebrow="Autonomous continuity"
            title={state.business ? "Store is operating" : "Store is standing by"}
          />
          <div className="rail-status">
            <span className="status-dot" />
            <strong>{state.business ? "Operating" : "Standby"}</strong>
          </div>
          <Metric
            label="Revenue today"
            value={formatCurrency(state.order?.paymentReceipt?.amountCents ?? 0)}
            tone="good"
          />
          <Metric
            label="Gross margin"
            value={state.order?.paymentReceipt ? formatPercent(grossMargin) : "--"}
            tone="good"
          />
          <Metric
            label="Ledger spend today"
            value={formatCurrency(state.wallet.spentTodayCents)}
          />
          <div className="optimization-card">
            <span>Next autonomous move</span>
            {state.business ? (
              <>
                <strong>Shopify brands with checkout friction - $7</strong>
                <p>
                  A smaller impulse SKU keeps the merchant expanding inventory
                  without breaking its margin discipline.
                </p>
              </>
            ) : (
              <>
                <strong>
                  Next move appears after the merchant launches and learns from
                  demand.
                </strong>
                <p>
                  Continuity logic stays quiet until MarginPilot has an actual
                  service catalog to optimize.
                </p>
              </>
            )}
          </div>
        </aside>
      </section>

      <section className="panel storefront-section">
        <SectionTitle
          icon={LayoutGrid}
          eyebrow="Service catalog"
          title="A sellable offer, not a research assistant"
          copy="The agent publishes priced SKUs, selects the flagship Growth Pack, and routes it into a commercial order decision."
        />

        <p className="pricing-sync-note">
          Canonical service pricing: Starter $29, Growth $99, Scale $299.
        </p>

        <div className="sku-grid">
          {(state.business?.skus ?? []).map((sku) => (
            <button
              className={`sku-card ${state.selectedSkuId === sku.id ? "selected" : ""}`}
              key={sku.id}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  selectedSkuId: sku.id,
                }))
              }
            >
              <div>
                <span>{sku.name}</span>
                <strong>{formatCurrency(sku.priceCents)}</strong>
              </div>
              <p>{sku.description}</p>
              <small>
                {sku.includedLeads} leads · estimated fulfillment{" "}
                {formatCurrency(sku.estimatedCostRangeCents[0])}-
                {formatCurrency(sku.estimatedCostRangeCents[1])}
              </small>
            </button>
          ))}

          {!state.business ? (
            <div className="sku-placeholder">
              Form the merchant to publish its service catalog.
            </div>
          ) : null}
        </div>

        {selectedSku ? (
          <div className="storefront-cta">
            <div>
              <span>Flagship order path</span>
              <strong>
                {selectedSku.name} · {formatCurrency(selectedSku.priceCents)}
              </strong>
            </div>
            <button
              className="primary-button"
              onClick={handleStartOrder}
              disabled={busyAction === "order"}
            >
              {busyAction === "order" ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              Start {selectedSku.name} order
            </button>
          </div>
        ) : null}
      </section>

      <section className="transaction-grid">
        <article className="panel judgment-panel">
          <SectionTitle
            icon={ShieldCheck}
            eyebrow="Merchant judgment"
            title="The agent decides whether this order deserves settlement"
            copy="Revenue is not enough. MarginPilot only accepts demand when the quote clears its cost model and margin floor."
          />

          {state.order ? (
            <>
              <div className="decision-hero">
                <DecisionPill decision={state.order.assessment.decision} />
                <div>
                  <span>Autonomous verdict</span>
                  <strong>
                    {formatCurrency(state.order.assessment.quotedPriceCents)}{" "}
                    quote protects{" "}
                    {formatCurrency(projectedGrossProfit)} projected gross profit.
                  </strong>
                  <p>{state.order.assessment.rationale}</p>
                </div>
              </div>

              <div className="judgment-grid">
                <Metric
                  label="Quoted price"
                  value={formatCurrency(state.order.assessment.quotedPriceCents)}
                />
                <Metric
                  label="Estimated spend"
                  value={formatCurrency(state.order.assessment.estimatedSpendCents)}
                />
                <Metric
                  label="Spend range"
                  value={`${formatCurrency(state.order.assessment.estimatedSpendRangeCents[0])}-${formatCurrency(state.order.assessment.estimatedSpendRangeCents[1])}`}
                />
                <Metric
                  label="Margin floor"
                  value={formatPercent(state.order.assessment.requiredGrossMargin)}
                />
                <Metric
                  label="Projected margin"
                  value={formatPercent(state.order.assessment.projectedGrossMargin)}
                  tone="good"
                />
              </div>

              <div className="decision-branches">
                <span>Underpriced orders would be repriced or rejected here</span>
                <div>
                  <em>ACCEPT</em>
                  <em>REPRICE</em>
                  <em>REJECT</em>
                </div>
              </div>

              <aside className="stress-test-card">
                <div>
                  <span>Margin stress test</span>
                  <strong>{marginStressTest.sku.name}</strong>
                </div>
                <div className="stress-test-grid">
                  <Metric
                    label="Quoted"
                    value={formatCurrency(marginStressTest.assessment.quotedPriceCents)}
                  />
                  <Metric
                    label="Estimated spend"
                    value={formatCurrency(marginStressTest.assessment.estimatedSpendCents)}
                    tone="warn"
                  />
                  <Metric
                    label="Margin"
                    value={formatPercent(marginStressTest.assessment.projectedGrossMargin)}
                    tone="warn"
                  />
                </div>
                <div className="stress-test-verdict">
                  <DecisionPill decision={marginStressTest.assessment.decision} />
                  <p>
                    The same merchant would reprice this unprofitable custom
                    order before settlement opens.{" "}
                    Reprice to{" "}
                    {formatCurrency(
                      marginStressTest.assessment.recommendedPriceCents ?? 0,
                    )}{" "}
                    before settlement opens.
                  </p>
                </div>
              </aside>

              <button
                className="primary-button"
                onClick={handleMerchantDecision}
                disabled={
                  busyAction === "checkout" ||
                  state.order.status === "checkout_ready" ||
                  state.order.status === "paid" ||
                  state.order.status === "fulfilling" ||
                  state.order.status === "delivered"
                }
              >
                {busyAction === "checkout" ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
                {state.order.assessment.decision === "ACCEPT"
                  ? "Accept order and open settlement"
                  : state.order.assessment.decision === "REPRICE"
                    ? "Apply agent reprice"
                    : "Reject order"}
              </button>
            </>
          ) : (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <p>
                Select the Growth Pack and start an order to watch the merchant
                protect its economics before settlement.
              </p>
            </div>
          )}
        </article>

        <article className="panel checkout-panel">
          <SectionTitle
            icon={ReceiptText}
            eyebrow="Settlement event"
            title="Settlement opens only after ACCEPT"
            copy="The demo uses a simulated settlement callback: merchant approval first, order value second, production spend third."
          />

          <p className="checkout-limit-note">
            Settlement is simulated for this hackathon prototype; no real charge
            or customer revenue is claimed.
          </p>

          <label className="field-label" htmlFor="buyer-email">
            Buyer email
          </label>
          <input
            id="buyer-email"
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
          />

          <label className="field-label" htmlFor="buyer-request">
            Buyer request
          </label>
          <input
            id="buyer-request"
            type="text"
            value={state.buyerRequest}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                buyerRequest: event.target.value,
              }))
            }
          />

          <div className="checkout-ticket">
            <span>Session state</span>
            <strong>
              {state.order?.checkoutSession
                ? state.order.checkoutSession.id
                : "Not opened"}
            </strong>
            <small>
              {state.order?.paymentReceipt
                ? `Simulated callback settled ${formatCurrency(state.order.paymentReceipt.amountCents)}`
                : "Settlement stays closed until merchant judgment approves the order."}
            </small>
          </div>

          <div className="locus-map">
            <div>
              <span>Operating sequence</span>
              <strong>Profit-aware path, simulated settlement</strong>
            </div>
            <ol>
              <li>create settlement session</li>
              <li>settlement.succeeded callback</li>
              <li>credit merchant ledger</li>
              <li>reserve fulfillment budget</li>
              <li>AI synthesis spend</li>
              <li>settle margin</li>
            </ol>
          </div>

          <button
            className="primary-button accent"
            onClick={handlePayment}
            disabled={
              !state.order?.checkoutSession ||
              busyAction === "payment" ||
              !!state.order?.paymentReceipt
            }
          >
            {busyAction === "payment" ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <CircleDollarSign size={18} />
            )}
            {state.order?.paymentReceipt
              ? "Settlement callback received"
              : "Complete simulated settlement"}
          </button>
        </article>
      </section>

      <section className="manufacturing-grid">
        <article className="panel manufacturing-panel">
          <SectionTitle
            icon={Factory}
            eyebrow="Production line"
            title="The paid product is manufactured in public"
            copy="Settlement kicks off a visible production line. Each completed stage either spends money, increases quality, or unlocks delivery."
          />

          <div className="progress-track">
            <span style={{ width: `${phaseCompletion * 100}%` }} />
          </div>

          <div className="phase-list">
            {(state.fulfillmentJob?.phases ?? []).map((phase, index) => (
              <div className={`phase-row phase-${phase.status}`} key={phase.id}>
                <div className="phase-index">{index + 1}</div>
                <div>
                  <strong>{phase.label}</strong>
                  <p>{phase.description}</p>
                </div>
                <span>{phase.status}</span>
              </div>
            ))}

            {!state.fulfillmentJob ? (
              <div className="empty-state">
                <Boxes size={28} />
                <p>Settlement starts the five-step prospect-pack production line.</p>
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel ledger-panel">
          <SectionTitle
            icon={Landmark}
            eyebrow="Merchant ledger"
            title="Money moves with the work"
          />

          <div className="ledger-summary">
            <Metric
              label="Revenue"
              value={formatCurrency(state.order?.paymentReceipt?.amountCents ?? 0)}
              tone="good"
            />
            <Metric
              label="Fulfillment cost"
              value={formatCurrency(totalSpend)}
            />
            <Metric
              label="Gross margin"
              value={state.order?.paymentReceipt ? formatPercent(grossMargin) : "--"}
              tone="good"
            />
          </div>

          <p className="cost-scope-note">
            MarginPilot&apos;s $6.70 is automated production-layer spend for the
            demo order, not full-service operations overhead.
          </p>

          <div className="wallet-flow-grid">
            <Metric
              label="Revenue inflow"
              value={
                state.wallet.creditedTodayCents > 0
                  ? `+${formatCurrency(state.wallet.creditedTodayCents)}`
                  : formatCurrency(0)
              }
              tone="good"
            />
            <Metric
              label="Fulfillment outflow"
              value={
                state.wallet.spentTodayCents > 0
                  ? `-${formatCurrency(state.wallet.spentTodayCents)}`
                  : formatCurrency(0)
              }
              tone="warn"
            />
            <Metric
              label="Ending ledger"
              value={formatCurrency(state.wallet.availableBalanceCents)}
              tone="good"
            />
          </div>

          <div className="spend-table">
            <div className="spend-head">
              <span>Spend event</span>
              <span>Manufacturing stage</span>
              <span>Provider</span>
              <span>Cost</span>
            </div>
            {spendEvents.map((spend) => (
              <div className="spend-row" key={spend.id}>
                <span>{spend.label}</span>
                <span>{phaseLabels.get(spend.phaseId) ?? "Fulfillment"}</span>
                <span>{spend.provider}</span>
                <strong>{formatCurrency(spend.amountCents)}</strong>
              </div>
            ))}
            {spendEvents.length === 0 ? (
              <div className="spend-empty">
                Provider spend will materialize phase by phase.
              </div>
            ) : null}
          </div>

          <div className="wallet-card">
            <Wallet size={18} />
            <div>
              <span>Order ledger</span>
              <strong>
                {formatCurrency(state.wallet.startingBalanceCents)} start ·{" "}
                {formatCurrency(state.wallet.creditedTodayCents)} inflow ·{" "}
                {formatCurrency(state.wallet.spentTodayCents)} outflow
              </strong>
            </div>
          </div>

          <div className="synthesis-proof-row">
            <FileSpreadsheet size={18} />
            <div>
              <span>
                {synthesisProof?.mode === "live-gemini"
                  ? "Gemini Fulfillment Agent"
                  : "Deterministic fallback agent"}
              </span>
              <strong>
                {synthesisProof?.provider ??
                  "waiting for final synthesis stage"}
              </strong>
              {synthesisProof?.modelFallbackNote ? (
                <em>{synthesisProof.modelFallbackNote}</em>
              ) : null}
              {synthesisProof ? (
                <em>{synthesisProof.resilienceStatus}</em>
              ) : null}
              <p>
                {synthesisProof
                  ? `${synthesisProof.data.agentDecision} - ${synthesisProof.data.qualityGate}`
                  : "One Gemini fulfillment-agent call is attempted after settlement when Gemini env vars are enabled."}
              </p>
              {synthesisProof ? (
                <>
                  <p>
                    <strong>Buyer request:</strong>{" "}
                    {synthesisProof.data.buyerRequest}
                  </p>
                  <div className="agent-account-list">
                    {selectedAgentAccounts.slice(0, 3).map((account) => (
                      <div key={account.company}>
                        <strong>{account.company}</strong>
                        <span>{account.whySelected}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <section className="panel deliverable-panel">
        <SectionTitle
          icon={PackageCheck}
          eyebrow="Paid deliverable"
          title={deliverable?.title ?? "A client-ready Prospect Pack is next"}
          copy={
            synthesisProof?.data.packSummary ??
            deliverable?.clientSummary ??
            "The paid asset appears only after the merchant has sold, spent, and completed autonomous fulfillment."
          }
        />

        <div className="deliverable-summary">
          <Metric
            label="Pack size"
            value={deliverable ? "40 accounts" : "40 accounts queued"}
          />
          <Metric
            label="Average confidence"
            value={deliverable ? `${averageConfidence}/100` : "--"}
            tone="good"
          />
          <Metric
            label="Client format"
            value={deliverable ? "Preview + CSV" : "Unlocks after delivery"}
          />
        </div>

        <div className="deliverable-toolbar">
          <div>
            <FileSpreadsheet size={18} />
            <span>
              {deliverable
                ? deliverable.subtitle
                : "CSV export stays locked until the merchant delivers the paid product."}
            </span>
          </div>
          <button
            className="ghost-button"
            disabled={!deliverable}
            onClick={() => deliverable && downloadPack(deliverable)}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {synthesisProof ? (
          <div className="agent-deliverable-strip">
            <div>
              <span>Agent decision</span>
              <strong>{synthesisProof.data.agentDecision}</strong>
            </div>
            <div>
              <span>Selected-account rationale</span>
              <strong>{synthesisProof.data.topAccountRationale}</strong>
            </div>
            <div>
              <span>Outreach opener</span>
              <strong>{synthesisProof.data.outreachAngle}</strong>
            </div>
          </div>
        ) : null}

        {deliveryReceipt ? (
          <div className="delivery-receipt">
            <div className="delivery-receipt-head">
              <div>
                <span>Delivery Receipt</span>
                <strong>Fulfillment audit trail</strong>
              </div>
              <button
                className="ghost-button"
                onClick={() => navigator.clipboard.writeText(receiptJson)}
              >
                <ReceiptText size={16} />
                Copy JSON
              </button>
            </div>
            <div className="receipt-grid">
              <Metric
                label="Buyer request"
                value={deliveryReceipt.buyerRequest}
              />
              <Metric
                label="Agent decision"
                value={deliveryReceipt.agentDecision}
                tone="good"
              />
              <Metric
                label="Quality gate"
                value={deliveryReceipt.qualityGate}
                tone="good"
              />
              <Metric
                label="Provider/model"
                value={deliveryReceipt.provider}
              />
              <Metric
                label="Resilience"
                value={deliveryReceipt.resilienceStatus}
                tone="good"
              />
              <Metric
                label="Order value"
                value={deliveryReceipt.simulatedOrderValue}
                tone="good"
              />
              <Metric
                label="Production spend"
                value={deliveryReceipt.automatedProductionSpend}
                tone="warn"
              />
              <Metric
                label="Ending ledger"
                value={deliveryReceipt.endingLedger}
                tone="good"
              />
            </div>
            <div className="receipt-account-list">
              {deliveryReceipt.selectedAccounts.slice(0, 3).map((account) => (
                <div key={account.company}>
                  <strong>{account.company}</strong>
                  <span>{account.whySelected}</span>
                </div>
              ))}
            </div>
            <details className="receipt-json">
              <summary>Receipt JSON</summary>
              <pre>{receiptJson}</pre>
            </details>
          </div>
        ) : null}

        <div className="deliverable-table">
          <div className="deliverable-head">
            <span>#</span>
            <span>Company</span>
            <span>Evidence snippet</span>
            <span>Why it fits</span>
            <span>Score</span>
            <span>Outreach angle</span>
          </div>

          {(deliverable?.leads ?? []).map((lead) => (
            <div className="deliverable-row" key={lead.id}>
              <strong>{lead.priorityRank}</strong>
              <div>
                <span>{lead.company}</span>
                <small>{lead.niche}</small>
              </div>
              <p>{lead.publicSignal}</p>
              <p>{lead.fitReason}</p>
              <strong>{lead.confidenceScore}</strong>
              <p>{lead.outreachAngle}</p>
            </div>
          ))}

          {!deliverable ? (
            <div className="deliverable-empty">
              <PackageCheck size={28} />
              <p>
                Complete settlement to manufacture the 10-lead client-ready pack.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel continuity-panel">
        <SectionTitle
          icon={Banknote}
          eyebrow="Post-order continuity"
          title="The operating loop survives the order"
          copy="The merchant accepted profitable demand, funded production, delivered the asset, and kept its ledger positive for the next order."
        />

        <div className="continuity-grid">
          <Metric
            label="Store status"
            value={state.business ? "Operating" : "Standby"}
            tone="good"
          />
          <Metric
            label="Revenue today"
            value={formatCurrency(state.order?.paymentReceipt?.amountCents ?? 0)}
            tone="good"
          />
          <Metric
            label="Fulfillment cost"
            value={formatCurrency(totalSpend)}
          />
          <Metric
            label="Gross margin"
            value={state.order?.paymentReceipt ? formatPercent(grossMargin) : "--"}
            tone="good"
          />
          <Metric
            label="Gross profit"
            value={
              state.order?.paymentReceipt
                ? formatCurrency(realizedGrossProfit)
                : "--"
            }
            tone="good"
          />
        </div>

        <div className="continuity-strip">
          <CheckCircle2 size={18} />
          <span>
            Pricing optimizer proposes: &quot;Shopify brands with checkout
            friction - $7&quot;
          </span>
        </div>
      </section>
    </main>
  );
}
