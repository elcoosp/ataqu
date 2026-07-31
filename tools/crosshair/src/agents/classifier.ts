import { callLocalLLMWithJson } from '../llm/client';

const CLASSIFIER_SYSTEM = `
You are a filter for B2B SaaS complaints.
Your ONLY job is to determine if a text contains a genuine complaint about a software tool.
Ignore job postings, news articles, tutorials, or generic questions without frustration.
Return ONLY valid JSON.
`;

const CLASSIFIER_PROMPT = `
Analyze this text:
"{text}"

Is this a genuine user complaint about a software tool?
Return JSON:
{
  "is_complaint": true/false,
  "competitor": "Name of the tool they complain about, or null",
  "confidence": 0.0-1.0
}
`;

export async function classifySignal(rawText: string): Promise<{
  is_complaint: boolean;
  competitor: string | null;
  confidence: number;
}> {
  const prompt = CLASSIFIER_PROMPT.replace('{text}', rawText.slice(0, 1500));
  try {
    const raw = await callLocalLLMWithJson<any>(prompt, CLASSIFIER_SYSTEM);
    return raw;
  } catch (e) {
    console.warn('Classifier failed, defaulting to complaint=false.');
    return { is_complaint: false, competitor: null, confidence: 0 };
  }
}
