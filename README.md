# PromptCart AI

PromptCart AI demonstrates the operating loop for a real LocusFounder-created business.

**Tagline:** LocusFounder starts the business. PromptCart AI runs it like a merchant.

For Locus Paygentic Hackathon Week 4, LocusFounder created **Pipeline Packs**, a productized business that sells evidence-backed prospect packs to boutique CRO and growth agencies. PromptCart AI then shows how that business can operate after launch: merchant judgment, simulated checkout settlement, merchant ledger accounting, AI fulfillment, delivery, and margin tracking.

## Live Links

- PromptCart AI app: <https://promptcart-ai.vercel.app>
- LocusFounder storefront: <https://svc-mp5n8uzwxp69yxs2.buildwithlocus.com>
- LocusFounder business plan PDF: <https://api.locusfounder.com/api/onboarding/prospect/2c40a15b-3d32-4894-86df-8cd2333eb7ac/plan.pdf>
- GitHub repository: <https://github.com/luzzwaix/promptcart-ai>

## What Is Verified

PromptCart AI separates verified artifacts from simulated rails clearly.

| Layer | Status |
| --- | --- |
| LocusFounder business creation | Verified |
| LocusFounder storefront deployment | Verified |
| LocusFounder business plan PDF | Verified |
| Locus platform credit spend during build/deploy iteration | Verified |
| Gemini Fulfillment Agent | Live when configured |
| Checkout settlement | Simulated |
| Merchant wallet settlement | Simulated |
| Real customer payment/revenue | Not claimed |

Stripe Connect is unavailable in Kazakhstan. Locus staff confirmed that a clearly labeled mock checkout is acceptable for Week 4 submissions when no real payment is claimed.

## The Product

Pipeline Packs sells finished prospect-intelligence assets, not raw lead databases.

The LocusFounder-generated storefront uses three SKUs:

- Starter: `$29`
- Growth: `$99`
- Scale: `$299`

PromptCart uses the same pricing in its operating demo. The canonical flow uses the `Growth Pack`.

## Canonical Demo Flow

1. Review the LocusFounder proof: live storefront, business plan, and platform credit spend.
2. Open PromptCart AI and review the "One business, two layers" judge brief.
3. Watch the business audit connect the Founder-created Pipeline Packs concept to the operating loop.
4. Select the `Growth Pack`.
5. Edit or keep the buyer request:
   `Find Shopify brands with checkout friction for a CRO agency targeting DTC apparel.`
6. Review merchant judgment:
   - quoted price
   - estimated automated production spend
   - margin floor
   - accept/reprice/reject logic
7. Trigger the clearly labeled simulated checkout settlement.
8. Watch the fulfillment pipeline run.
9. Inspect the Gemini Fulfillment Agent decision, selected accounts, quality gate, and operator note.
10. Review the delivered Prospect Pack and exported CSV.
11. End on the margin dashboard and next-SKU continuity state.

## Canonical Economics

The canonical order demonstrates the merchant ledger math for the `Growth Pack`:

- Starting wallet: `$42.00`
- Simulated payment inflow: `+$99.00`
- Automated production-layer spend: `-$6.70`
- Ending wallet: `$134.30`
- Gross margin: about `93%`

`$6.70` represents the automated production layer in the PromptCart demo. The LocusFounder storefront also models broader full-service fulfillment overhead.

## Gemini Fulfillment Agent

PromptCart includes one live AI fulfillment step when environment variables are configured.

The agent receives:

- buyer request
- business and SKU context
- representative lead data
- founder prompt
- order economics

It returns structured output:

- `SHIP_PACK` or `NEEDS_REVIEW`
- selected accounts
- pack summary
- quality gate
- fit-score rationale
- outreach opener
- operator note

Reliability behavior:

1. Try `gemini-2.5-flash-lite`.
2. If it fails, try `gemini-2.5-flash`.
3. If both fail, use deterministic fallback output so the demo remains stable.

The API key is server-side only and is never exposed to the client.

## Simulated Rails

This project does **not** claim:

- processed real payments
- live Locus Checkout settlement
- live Locus wallet settlement
- real customer revenue
- production-ready autonomous commerce

The checkout and wallet rails are simulated, but shaped around the same product sequence a live integration would need:

1. merchant profitability decision
2. checkout session
3. paid callback
4. merchant ledger credit
5. fulfillment budget reserve
6. AI production spend
7. margin settlement

The relevant boundaries are isolated in:

- `src/lib/locus-adapters.ts`
- `src/app/api/locus/synthesize/route.ts`

## Architecture

Key files:

- `src/components/promptcart-app.tsx` - main operating-loop UI
- `src/components/merchant-loop-scene.tsx` - Three.js merchant-loop visual
- `src/lib/business-engine.ts` - pricing, profitability, fulfillment, and ledger logic
- `src/lib/locus-adapters.ts` - simulated checkout and wallet rails
- `src/lib/types.ts` - domain model
- `src/app/api/locus/synthesize/route.ts` - Gemini Fulfillment Agent route

Core domain concepts:

- `FounderPrompt`
- `BusinessBlueprint`
- `SKU`
- `Order`
- `ProfitabilityAssessment`
- `FulfillmentJob`
- `SpendEvent`
- `ProspectLead`
- `DeliverablePack`
- `LocusCheckoutGateway`
- `LocusWalletClient`

The app persists demo state with a versioned local-storage envelope so the judging flow remains replayable.

## Run Locally

```bash
npm install
npm run dev
```

Optional live Gemini fulfillment:

```bash
GEMINI_API_KEY=your_key
ENABLE_LIVE_GEMINI_SYNTHESIS=true
```

Verification:

```bash
npm run lint
npm run build
```

## Judge Takeaway

PromptCart AI is not claiming live payment processing. It is a clear operating-loop prototype for a real LocusFounder-created business: a merchant that evaluates unit economics, accepts profitable demand, routes settlement through simulated rails, uses a live Gemini Fulfillment Agent, delivers a paid digital asset, and shows retained margin.
