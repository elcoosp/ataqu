import { callLocalLLMWithJson } from "../llm/client";

const LEAD_SYSTEM = `You are a Sales Analyst. Extract buyer profile and urgency.
Focus on: who they are, what they do, how urgent the problem is.
Return ONLY valid JSON.`;

const LEAD_PROMPT = `Complaint text:
"{text}"

Extract:
1. buyer_segment: exact role (e.g., "CEO of a 10-person startup", "Head of Ops at a 50-person company")
2. workflow: the specific task they're trying to do (e.g., "writing candidate summaries", "managing inventory")
3. current_workaround: how they solve it now (e.g., "manual spreadsheets", "copy-paste from email")
4. direct_quote: the most powerful sentence expressing frustration
5. urgency_score: 0-10 (how urgent is the problem?)
6. buying_intent_score: 0-10 (are they actively looking for a solution?)
7. frequency_score: 0-10 (how often does this problem occur?)

Return JSON:
{
  "buyer_segment": "string",
  "workflow": "string",
  "current_workaround": "string",
  "direct_quote": "string",
  "urgency_score": 0-10,
  "buying_intent_score": 0-10,
  "frequency_score": 0-10
}`;

export async function extractLeadData(rawText: string): Promise<{
	buyer_segment: string;
	workflow: string;
	current_workaround: string;
	direct_quote: string;
	urgency_score: number;
	buying_intent_score: number;
	frequency_score: number;
}> {
	const prompt = LEAD_PROMPT.replace("{text}", rawText.slice(0, 1500));
	try {
		const raw = await callLocalLLMWithJson<any>(prompt, LEAD_SYSTEM);
		return raw;
	} catch (_e) {
		console.warn("Lead extraction failed, returning defaults.");
		return {
			buyer_segment: "Unknown",
			workflow: "Unknown",
			current_workaround: "Unknown",
			direct_quote: "No quote",
			urgency_score: 0,
			buying_intent_score: 0,
			frequency_score: 0,
		};
	}
}
