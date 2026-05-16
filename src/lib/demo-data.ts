import type { ProspectLead } from "@/lib/types";

export const CANONICAL_PROMPT =
  "Build a digital business that sells evidence-backed prospect packs to boutique CRO agencies.";

export const PROSPECT_LEADS: ProspectLead[] = [
  {
    id: "lead-01",
    company: "Northlane Skincare",
    niche: "DTC beauty",
    publicSignal:
      "Homepage rotates three acquisition offers, while the cart still defaults to a single static upsell module.",
    fitReason:
      "Boutique CRO agencies can pitch offer sequencing, cart message testing, and bundle experiments.",
    confidenceScore: 96,
    outreachAngle:
      "Lead with the mismatch between acquisition testing and one-size-fits-all cart conversion.",
    priorityRank: 1,
  },
  {
    id: "lead-02",
    company: "Relay Outdoor",
    niche: "Premium gear",
    publicSignal:
      "Paid landing pages emphasize comparison proof, yet PDPs bury technical differentiators below long lifestyle blocks.",
    fitReason:
      "Clear information hierarchy issue with likely upside in PDP engagement and product understanding.",
    confidenceScore: 94,
    outreachAngle:
      "Offer a proof-forward PDP test to surface spec credibility before the first scroll break.",
    priorityRank: 2,
  },
  {
    id: "lead-03",
    company: "Kindred Supplements",
    niche: "Wellness subscription",
    publicSignal:
      "Subscription benefits appear only after variant selection, and cancellation reassurance is absent near the CTA.",
    fitReason:
      "High-intent subscription flow with visible friction around commitment confidence.",
    confidenceScore: 93,
    outreachAngle:
      "Pitch a trust-first subscription CTA treatment with expectation-setting microcopy.",
    priorityRank: 3,
  },
  {
    id: "lead-04",
    company: "ForgeOps",
    niche: "B2B SaaS",
    publicSignal:
      "Pricing page drives to demo requests, but case-study evidence is disconnected from plan comparison.",
    fitReason:
      "Agency can connect commercial proof to the moment of pricing evaluation.",
    confidenceScore: 91,
    outreachAngle:
      "Suggest anchoring each tier with proof from a matched customer story and measurable outcome.",
    priorityRank: 4,
  },
  {
    id: "lead-05",
    company: "Harbor Pantry",
    niche: "Food commerce",
    publicSignal:
      "Bundle page uses persuasive photography but no delivery-timing or freshness reassurance near purchase.",
    fitReason:
      "Checkout anxiety is commercially relevant and straightforward to test.",
    confidenceScore: 89,
    outreachAngle:
      "Position a reassurance module test that reduces uncertainty without discounting.",
    priorityRank: 5,
  },
  {
    id: "lead-06",
    company: "Clarity Courseware",
    niche: "Edtech",
    publicSignal:
      "Lead magnet CTA is prominent, yet the paid-course comparison matrix appears only after testimonials.",
    fitReason:
      "Intent capture exists; monetization path can be clarified earlier in the session.",
    confidenceScore: 88,
    outreachAngle:
      "Recommend a comparison-first funnel variant for visitors already showing purchase intent.",
    priorityRank: 6,
  },
  {
    id: "lead-07",
    company: "Atlas Recruiting",
    niche: "Talent services",
    publicSignal:
      "Service pages list broad capabilities, while industry-specific results are fragmented across the blog.",
    fitReason:
      "CRO agencies can package proof by segment to improve booked-call relevance.",
    confidenceScore: 87,
    outreachAngle:
      "Offer a verticalized proof architecture tied to industry-specific booking CTAs.",
    priorityRank: 7,
  },
  {
    id: "lead-08",
    company: "Solder Robotics",
    niche: "Industrial automation",
    publicSignal:
      "Technical buyers get strong feature detail, but request-a-quote pages omit implementation timing expectations.",
    fitReason:
      "Opportunity to reduce sales-cycle ambiguity on a high-value conversion point.",
    confidenceScore: 86,
    outreachAngle:
      "Pitch quote-form experiments that answer rollout timing before prospects self-disqualify.",
    priorityRank: 8,
  },
  {
    id: "lead-09",
    company: "Motive Fleet",
    niche: "Fleet software",
    publicSignal:
      "Navigation splits savings claims, compliance claims, and live demo proof across separate pages with no unified conversion path.",
    fitReason:
      "Strong candidate for message consolidation and intent-routing tests.",
    confidenceScore: 84,
    outreachAngle:
      "Lead with a friction map showing how proof fragments before the buyer reaches demo intent.",
    priorityRank: 9,
  },
  {
    id: "lead-10",
    company: "Willow Studio",
    niche: "Design services",
    publicSignal:
      "Portfolio depth is excellent, but the inquiry form lacks project-fit framing or expectation-setting copy.",
    fitReason:
      "Service businesses often lift lead quality by improving self-selection before form submission.",
    confidenceScore: 82,
    outreachAngle:
      "Suggest a fit-qualification form variant that trades raw lead count for stronger close rates.",
    priorityRank: 10,
  },
];
