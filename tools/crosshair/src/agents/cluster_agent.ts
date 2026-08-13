import { callLocalLLMWithJson } from "../llm/client";

const CLUSTER_SYSTEM = `You are a Product Strategist. Group complaints by shared feature gaps, pricing issues, or UX pain.
Be specific. Return ONLY valid JSON.`;

const CLUSTER_PROMPT = `Complaints list (each with a quote and a feature gap):
{data}

Identify the most common product gap, pricing complaint, or UX issue.
Return JSON:
{
  "name": "short name for the cluster (e.g., 'Bulk edit missing')",
  "core_pain": "description of the core problem",
  "common_workarounds": "how users work around it",
  "manual_mvp": "a simple way to test this manually",
  "verdict": "build_test | watch | ignore"
}`;

export async function clusterComplaints(data: string): Promise<{
	name: string;
	core_pain: string;
	common_workarounds: string;
	manual_mvp: string;
	verdict: "build_test" | "watch" | "ignore";
}> {
	const prompt = CLUSTER_PROMPT.replace("{data}", data.slice(0, 3000));
	try {
		const raw = await callLocalLLMWithJson<any>(prompt, CLUSTER_SYSTEM);
		return raw;
	} catch (_e) {
		console.warn("Clustering failed, returning default.");
		return {
			name: "Unnamed cluster",
			core_pain: "Unknown",
			common_workarounds: "Unknown",
			manual_mvp: "Unknown",
			verdict: "watch",
		};
	}
}
