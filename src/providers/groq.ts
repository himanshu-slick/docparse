import { postJson, withBackoff } from './retry.js';
import type { Pricing, Provider } from './types.js';

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function groq(name: string, model: string, pricing: Pricing, apiKey = process.env.GROQ_API_KEY): Provider {
  return {
    name,
    model,
    pricing,
    async complete({ system, prompt }) {
      if (!apiKey) throw new Error('GROQ_API_KEY is not set');
      const body = {
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      };
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const start = Date.now();
      const res = (await withBackoff(() => postJson(url, { authorization: `Bearer ${apiKey}` }, body))) as ChatResponse;
      return {
        text: res.choices?.[0]?.message?.content ?? '',
        latencyMs: Date.now() - start,
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
      };
    },
  };
}

export const groqGptOss = () =>
  groq('groq-gpt-oss', process.env.GROQ_GPT_OSS_MODEL ?? 'openai/gpt-oss-120b', { inputPerM: 0.15, outputPerM: 0.75 });

export const groqQwen = () =>
  groq('groq-qwen', process.env.GROQ_QWEN_MODEL ?? 'qwen/qwen3-32b', { inputPerM: 0.29, outputPerM: 0.59 });
