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
  ExternalLink,
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
  SKU,
} from "@/lib/types";

const STORAGE_KEY = "promptcart-ai-demo-state";
const STORAGE_VERSION = 8;
const LOCUSFOUNDER_STOREFRONT =
  "https://svc-mp5n8uzwxp69yxs2.buildwithlocus.com";
const LOCUSFOUNDER_PLAN =
  "https://api.locusfounder.com/api/onboarding/prospect/2c40a15b-3d32-4894-86df-8cd2333eb7ac/plan.pdf";
const checkoutGateway = new DemoLocusCheckoutGateway();
const walletClient = new DemoLocusWalletClient();

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
        <span>Loading PromptCart AI</span>
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
            <p>PromptCart AI</p>
            <strong>Pipeline Packs autonomous merchant</strong>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="demo-chip">Checkout + wallet flow: simulated</span>
          <button className="ghost-button" onClick={resetDemo}>
            <RefreshCw size={16} />
            Reset demo
          </button>
        </div>
      </header>

      <section className="judge-brief panel">
        <div className="judge-brief-layout">
          <div className="judge-brief-main">
            <span>Judge brief</span>
            <h1>One business, two layers.</h1>
            <p>
              LocusFounder created Pipeline Packs. PromptCart AI operates the
              order: merchant judgment, checkout callback, wallet math, Gemini
              Fulfillment Agent, and a delivered Prospect Pack.
            </p>
            <p className="judge-proof-line">
              Verified artifacts: LocusFounder business + Gemini Fulfillment Agent.
              Simulated rails: checkout and wallet settlement.
            </p>
            <div className="judge-artifact-links" aria-label="Live Founder artifacts">
              <a href={LOCUSFOUNDER_STOREFRONT} target="_blank" rel="noreferrer">
                Live LocusFounder storefront <ExternalLink size={13} />
              </a>
              <a href={LOCUSFOUNDER_PLAN} target="_blank" rel="noreferrer">
                Business plan PDF <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <MerchantLoopScene />
        </div>

        <div className="judge-proof-grid">
          <div className="judge-proof-card proof-live">
            <BadgeCheck size={18} />
            <span>Verified</span>
            <strong>
              LocusFounder business, storefront, plan, and build-credit usage
            </strong>
          </div>
          <div className="judge-proof-card proof-live">
            <Sparkles size={18} />
            <span>Verified</span>
            <strong>Gemini Fulfillment Agent decision during fulfillment</strong>
          </div>
          <div className="judge-proof-card proof-demo">
            <Wallet size={18} />
            <span>Simulated rail</span>
            <strong>Checkout callback and wallet ledger simulation</strong>
          </div>
          <div className="judge-proof-card proof-note">
            <ReceiptText size={18} />
            <span>Payment status</span>
            <strong>Checkout settlement is simulated; no real charge is claimed.</strong>
          </div>
        </div>

        <div className="proof-matrix" aria-label="Submission proof matrix">
          <div>
            <span>Verified</span>
            <ul>
              <li>LocusFounder created Pipeline Packs</li>
              <li>Live storefront exists</li>
              <li>Business plan PDF exists</li>
              <li>Locus platform credits were spent during build/deploy iteration</li>
              <li>Gemini Fulfillment Agent runs live when Gemini is enabled</li>
            </ul>
          </div>
          <div>
            <span>Simulated</span>
            <ul>
              <li>Checkout settlement</li>
              <li>Merchant wallet settlement</li>
            </ul>
          </div>
          <div>
            <span>Not claimed</span>
            <ul>
              <li>No real payment processing</li>
              <li>No live Locus wallet settlement</li>
              <li>No real customer revenue</li>
            </ul>
          </div>
        </div>

        <div className="judge-watch-path">
          <span>Watch path</span>
          <ol>
            <li>Open the live LocusFounder storefront and business plan links.</li>
            <li>Form the Pipeline Packs merchant blueprint.</li>
            <li>Run the Growth Pack order and margin decision.</li>
            <li>Finish fulfillment and verify the Gemini Fulfillment Agent decision.</li>
          </ol>
        </div>
      </section>

      <section className="founder-proof-grid">
        <article className="panel founder-proof-panel">
          <SectionTitle
            icon={BadgeCheck}
            eyebrow="Founder proof"
            title="Created by LocusFounder Beta"
            copy="LocusFounder generated the Pipeline Packs business artifact; PromptCart operates it through the merchant loop."
          />
          <div className="founder-proof-list">
            <div>
              <span>Business</span>
              <strong>Pipeline Packs</strong>
            </div>
            <a href={LOCUSFOUNDER_STOREFRONT} target="_blank" rel="noreferrer">
              <span>Live storefront</span>
              <strong>
                buildwithlocus.com <ExternalLink size={14} />
              </strong>
            </a>
            <a href={LOCUSFOUNDER_PLAN} target="_blank" rel="noreferrer">
              <span>Business plan PDF</span>
              <strong>
                locusfounder.com plan <ExternalLink size={14} />
              </strong>
            </a>
            <div>
              <span>Status</span>
              <strong>LocusFounder generated business artifact</strong>
            </div>
            <div>
              <span>PromptCart role</span>
              <strong>
                Autonomous operating loop for the Founder-created business
              </strong>
            </div>
          </div>
        </article>

        <article className="panel two-part-panel">
          <SectionTitle
            icon={Orbit}
            eyebrow="Two-part architecture"
            title="Created by Founder, operated by PromptCart"
            copy="The live LocusFounder artifact proves business creation; this local app proves autonomous operation without overclaiming live payments."
          />
          <div className="architecture-steps">
            <div>
              <span>1</span>
              <strong>LocusFounder created the business</strong>
              <p>Business plan, landing page, SKUs, pricing, and positioning.</p>
            </div>
            <div>
              <span>2</span>
              <strong>PromptCart operates the business</strong>
              <p>Merchant judgment, checkout callback, wallet ledger, fulfillment, and continuity.</p>
            </div>
            <div>
              <span>3</span>
              <strong>Checkout/wallet scope is clear</strong>
              <p>Simulated rails mapped to Locus primitives, not claimed as live revenue.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="command-grid">
        <article className="panel prompt-panel">
          <SectionTitle
            icon={Sparkles}
            eyebrow="Founder prompt"
            title="The founder gives only intent"
            copy="LocusFounder turned this intent into Pipeline Packs. PromptCart turns that business artifact into an operating merchant."
          />

          <label className="field-label" htmlFor="founder-prompt">
            FounderPrompt
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
              label="Operating wallet"
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
            eyebrow="Agent-founded business"
            title={state.business?.brandName ?? "Awaiting merchant formation"}
            copy={
              state.business?.valueProposition ??
              "The agent will found the business, publish its catalog, and declare the operating economics."
            }
          />

          {state.business ? (
            <>
              <div className="formation-banner">
                <Target size={18} />
                <div>
                  <span>Merchant birth moment</span>
                  <strong>
                    Founded from one prompt: a margin-disciplined storefront for
                    boutique CRO agencies.
                  </strong>
                </div>
              </div>

              <div className="model-audit">
                <div className="model-audit-head">
                  <span>Founder Audit</span>
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
                PromptCart has the founder intent. The merchant blueprint is one
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
            label="Wallet spend today"
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
                  Continuity logic stays quiet until PromptCart has an actual
                  storefront to optimize.
                </p>
              </>
            )}
          </div>
        </aside>
      </section>

      <section className="panel storefront-section">
        <SectionTitle
          icon={LayoutGrid}
          eyebrow="Generated storefront"
          title="A storefront, not a slide deck"
          copy="The agent publishes sellable SKUs, selects the flagship Growth Pack, and routes it into a real purchase decision."
        />

        <p className="pricing-sync-note">
          Pricing synced with LocusFounder: Starter $29, Growth $99, Scale $299.
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
              Form the merchant to publish its storefront.
            </div>
          ) : null}
        </div>

        {selectedSku ? (
          <div className="storefront-cta">
            <div>
              <span>Flagship checkout path</span>
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
            title="The agent decides whether this order deserves checkout"
            copy="Revenue is not enough. PromptCart only sells when the quote clears its cost model and margin floor."
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
                    order before checkout opens.{" "}
                    Reprice to{" "}
                    {formatCurrency(
                      marginStressTest.assessment.recommendedPriceCents ?? 0,
                    )}{" "}
                    before checkout opens.
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
                  ? "Accept order and open checkout"
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
                protect its economics before payment.
              </p>
            </div>
          )}
        </article>

        <article className="panel checkout-panel">
          <SectionTitle
            icon={ReceiptText}
            eyebrow="Locus Checkout"
            title="Checkout opens only after ACCEPT"
            copy="The demo uses a production-shaped Locus gateway: merchant approval first, payment callback second, fulfillment spend third."
          />

          <p className="checkout-limit-note">
            Checkout settlement is simulated because Stripe Connect is
            unavailable in Kazakhstan; Locus staff confirmed mock checkout is
            acceptable when no real payment is claimed.
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
                ? `Demo callback settled ${formatCurrency(state.order.paymentReceipt.amountCents)}`
                : "The Locus gateway stays closed until merchant judgment approves the order."}
            </small>
          </div>

          <div className="locus-map">
            <div>
              <span>Locus primitive mapping</span>
              <strong>Production-shaped path, simulated settlement</strong>
            </div>
            <ol>
              <li>create checkout session</li>
              <li>checkout.session.paid callback</li>
              <li>credit merchant wallet</li>
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
              ? "Payment callback received"
              : "Complete demo payment callback"}
          </button>
        </article>
      </section>

      <section className="manufacturing-grid">
        <article className="panel manufacturing-panel">
          <SectionTitle
            icon={Factory}
            eyebrow="Production line"
            title="The paid product is manufactured in public"
            copy="Payment kicks off a visible production line. Each completed stage either spends money, increases quality, or unlocks delivery."
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
                <p>Payment starts the five-step prospect-pack production line.</p>
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
            PromptCart&apos;s $6.70 is automated production-layer spend for the demo
            order; the LocusFounder storefront also models broader full-service
            fulfillment overhead.
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
              label="Ending wallet"
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
                  : "Demo fallback agent"}
              </span>
              <strong>
                {synthesisProof?.provider ??
                  "waiting for final synthesis stage"}
              </strong>
              {synthesisProof?.modelFallbackNote ? (
                <em>{synthesisProof.modelFallbackNote}</em>
              ) : null}
              <p>
                {synthesisProof
                  ? `${synthesisProof.data.agentDecision} - ${synthesisProof.data.qualityGate}`
                  : "One Gemini fulfillment-agent call is attempted after payment when Gemini env vars are enabled."}
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
                Complete checkout to manufacture the 10-lead client-ready pack.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel continuity-panel">
        <SectionTitle
          icon={Banknote}
          eyebrow="Post-order continuity"
          title="The storefront survives the sale"
          copy="A business was founded, accepted profitable demand, funded production, delivered the asset, and remained online for the next order."
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
