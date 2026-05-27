# MarginPilot AI

Resilient AI merchant operations for productized digital services.

## One-Line Pitch

MarginPilot AI evaluates incoming service orders, accepts only margin-safe demand, runs fallback-safe Gemini fulfillment, delivers a buyer-ready Prospect Pack, and leaves a receipt with revenue, cost, model, resilience, and margin visible.

## Submission Snapshot

| Item | Detail |
| --- | --- |
| Live app | <https://marginpilot-ai.vercel.app> |
| Repository | <https://github.com/luzzwaix/marginpilot-ai> |
| Canonical service | Pipeline Packs prospect-intelligence Growth Pack |
| AI proof | Gemini Fulfillment Agent with model fallback |
| Commercial proof | ACCEPT / REPRICE / REJECT profitability gate |
| Delivery proof | Prospect Pack preview, CSV export, and receipt JSON |
| Ledger proof | `$42.00 + $99.00 - $6.70 = $134.30` |

## Why This Matters

Most AI service tools generate text and leave business judgment to the operator. MarginPilot focuses on the missing operating layer: before an AI agent manufactures a digital service, it checks whether the order should be accepted at all.

The result is a compact merchant loop:

- capture buyer request
- assess price, spend, and margin floor
- accept, reprice, or reject
- simulate settlement
- run resilient AI fulfillment
- deliver the asset
- issue an audit receipt
- keep the ledger positive

## Core Loop

1. The operator forms a productized service merchant.
2. The Growth Pack SKU is priced at `$99`.
3. MarginPilot estimates automated production spend at `$6.70`.
4. The profit gate accepts the order because projected margin clears the `70%` floor.
5. Simulated settlement credits the merchant ledger.
6. Fulfillment runs discovery, signal extraction, qualification, inference, and outreach-angle generation.
7. Gemini Fulfillment Agent produces structured shipment rationale.
8. Delivery Receipt records buyer request, decision, quality gate, provider/model, resilience status, selected accounts, order value, spend, and ending ledger.

## AI/ML Implementation

The fulfillment stage makes one live Gemini call per order when configured:

- primary model: `gemini-2.5-flash-lite`
- fallback model: `gemini-2.5-flash`
- deterministic local fallback when live AI is unavailable or intentionally disabled

The server route accepts:

- buyer request
- business/service name
- SKU name
- representative lead signals
- order economics context
- resilience test mode

It returns structured JSON:

```json
{
  "agent_decision": "SHIP_PACK",
  "selected_accounts": [
    {
      "company": "...",
      "why_selected": "...",
      "risk": "...",
      "outreach_opener": "..."
    }
  ],
  "pack_summary": "...",
  "quality_gate": "...",
  "fit_score_rationale": "...",
  "operator_note": "..."
}
```

The client uses this output to enrich the Prospect Pack, selected-account rationale, outreach opener, and Delivery Receipt.

## Resilience Design

MarginPilot includes a Resilience Lab for the next fulfillment run:

- **Simulate primary model failure**: skips Flash Lite and verifies the fallback model path.
- **Simulate malformed JSON**: forces schema recovery and routes to fallback.
- **Simulate no API key**: uses deterministic local fulfillment.

Statuses shown in the app:

- `Primary model succeeded`
- `Fallback model used`
- `Deterministic fallback preserved delivery`

The deterministic path returns stable `SHIP_PACK` output so the canonical demo never collapses because of quota, malformed JSON, or missing credentials.

## Profitability Gate

The order gate evaluates:

- quoted price
- estimated production spend
- required gross margin floor
- projected gross margin
- recommended reprice when demand is underpriced

Canonical economics:

| Metric | Value |
| --- | --- |
| Starting ledger | `$42.00` |
| Simulated order value | `$99.00` |
| Automated production-layer spend | `$6.70` |
| Ending ledger | `$134.30` |
| Gross margin | about `93%` |

The UI also includes a compact stress-test scenario where an underpriced custom order triggers `REPRICE`, making clear that the agent does not accept every request.

## Demo Path

1. Open the app.
2. Confirm the first screen is MarginPilot AI, not a Locus-first proof deck.
3. Form the merchant.
4. Start the Growth Pack order.
5. Edit the buyer request if desired.
6. Inspect the ACCEPT / REPRICE / REJECT profit gate.
7. Complete simulated settlement.
8. Watch fulfillment complete.
9. Verify Gemini Fulfillment Agent and resilience status.
10. Review the Prospect Pack and Delivery Receipt.
11. Confirm ending ledger remains `$134.30`.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Three.js operating-loop visual
- Server route for Gemini Fulfillment Agent
- Local persistent demo state
- Adapter-shaped simulated settlement and ledger clients

Key files:

| File | Purpose |
| --- | --- |
| `src/components/promptcart-app.tsx` | Main operating UI and canonical flow |
| `src/components/merchant-loop-scene.tsx` | Three.js merchant operating loop |
| `src/app/api/locus/synthesize/route.ts` | Gemini Fulfillment Agent route |
| `src/lib/business-engine.ts` | SKU, profitability, fulfillment, ledger, and deliverable logic |
| `src/lib/locus-adapters.ts` | Simulated settlement and ledger adapters |
| `src/lib/types.ts` | Domain types |

## What Is Live

- The deployed Next.js app.
- The server-side Gemini Fulfillment Agent when `GEMINI_API_KEY` and `ENABLE_LIVE_GEMINI_SYNTHESIS=true` are configured.
- The fallback-chain behavior and deterministic continuity path.
- The full browser-based canonical Growth Pack flow.

## What Is Simulated

- Checkout/settlement callback.
- Merchant ledger settlement.
- Customer payment.
- Revenue collection.

These are simulated intentionally so the project can demonstrate commercial operating logic without claiming live payment processing.

## What We Do Not Claim

MarginPilot AI does not claim:

- real payment processing
- real customer revenue
- live bank/wallet settlement
- production financial compliance
- fully autonomous operation with no human review ever needed

This is an operating-loop prototype designed to prove AI/ML resilience, profitability logic, and deliverable quality.

## Prior Origin

This project began as a Locus Week 4 experiment around an agent-operated storefront. The current submission reframes the useful core as a standalone DevNetwork AI + ML Hackathon project: resilient AI merchant operations for productized digital services.

## Run Locally

```bash
npm install
npm run dev
```

Live Gemini fulfillment requires:

```bash
GEMINI_API_KEY=...
ENABLE_LIVE_GEMINI_SYNTHESIS=true
```

Verification:

```bash
npm run lint
npm run build
```
