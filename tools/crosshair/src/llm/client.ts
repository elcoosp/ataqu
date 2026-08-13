import "dotenv/config";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

export async function callLocalLLM(
	userPrompt: string,
	systemPrompt: string = "You are a helpful analyst. Respond only with valid JSON.",
	forceJson: boolean = true,
): Promise<string> {
	const url = `${OLLAMA_URL}/api/chat`;
	const messages = [
		{ role: "system", content: systemPrompt },
		{
			role: "user",
			content:
				userPrompt + (forceJson ? "\n\nRespond with valid JSON only." : ""),
		},
	];

	const payload = {
		model: OLLAMA_MODEL,
		messages,
		stream: false,
		temperature: 0.1,
		format: forceJson ? "json" : undefined,
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(
				`Ollama error: ${response.status} - ${await response.text()}`,
			);
		}

		const data = (await response.json()) as any;
		const content = data.message?.content || "";
		const cleaned = content
			.replace(/```json\n?/g, "")
			.replace(/```\n?/g, "")
			.trim();
		return cleaned;
	} catch (error) {
		console.error("Ollama call failed:", error);
		throw error;
	}
}

export async function callLocalLLMWithJson<T>(
	userPrompt: string,
	systemPrompt?: string,
): Promise<T> {
	const raw = await callLocalLLM(userPrompt, systemPrompt, true);
	try {
		return JSON.parse(raw) as T;
	} catch (_e) {
		console.error("Raw LLM output (failed to parse):", raw);
		throw new Error("LLM returned invalid JSON.");
	}
}
