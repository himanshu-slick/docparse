import { postJson, withBackoff } from './retry.js';
import type { Provider } from './types.js';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export function gemini(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'): Provider {
  return {
    name: 'gemini',
    model,
    pricing: { inputPerM: 0.3, outputPerM: 2.5 },
    async complete({ system, prompt }) {
      if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      };
      const start = Date.now();
      const res = (await withBackoff(() => postJson(url, { 'x-goog-api-key': apiKey }, body))) as GeminiResponse;
      return {
        text: res.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
        latencyMs: Date.now() - start,
        inputTokens: res.usageMetadata?.promptTokenCount,
        outputTokens: res.usageMetadata?.candidatesTokenCount,
      };
    },
  };
}
