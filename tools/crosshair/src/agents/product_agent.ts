import { callLocalLLMWithJson } from '../llm/client';

const PRODUCT_SYSTEM = `You are a Product Analyst. Extract exact product flaws from the complaint.
Focus on: missing features, pricing model issues, UX friction points.
Be as specific as possible. Return ONLY valid JSON.`;

const PRODUCT_PROMPT = `Complaint text:
"{text}"

Extract:
1. feature_gap: A specific missing feature (e.g., "no bulk edit for products", "no visual pipeline editor")
2. pricing_complaint: Exact pricing issue (e.g., "per-user fees increase with team size", "hidden costs for API access")
3. ux_friction: Concrete UX pain (e.g., "takes 5 clicks to update a deal", "slow loading of dashboard")
4. root_cause: Why this happens (e.g., "tool is too complex", "pricing scales unfairly")

Return JSON:
{
  "feature_gap": "string or null",
  "pricing_complaint": "string or null",
  "ux_friction": "string or null",
  "root_cause": "string or null",
  "feature_impact_score": 0-10
}`;

export async function extractProductData(rawText: string): Promise<{
  root_cause: string | null;
  feature_gap: string | null;
  pricing_complaint: string | null;
  ux_friction: string | null;
  feature_impact_score: number;
}> {
  const prompt = PRODUCT_PROMPT.replace('{text}', rawText.slice(0, 1500));
  try {
    const raw = await callLocalLLMWithJson<any>(prompt, PRODUCT_SYSTEM);
    return raw;
  } catch (e) {
    console.warn('Product extraction failed, returning nulls.');
    return { root_cause: null, feature_gap: null, pricing_complaint: null, ux_friction: null, feature_impact_score: 0 };
  }
}
