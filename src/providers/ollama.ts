import { postJson, withBackoff } from './retry.js';
import type { Provider } from './types.js';

interface OllamaResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

export function ollama(host = process.env.OLLAMA_HOST ?? 'http://localhost:11434', model = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b'): Provider {
  return {
    name: 'ollama',
    model,
    pricing: { inputPerM: 0, outputPerM: 0 },
    async complete({ system, prompt }) {
      const body = {
        model,
        stream: false,
        format: 'json',
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      };
      const start = Date.now();
      const res = (await withBackoff(() => postJson(`${host}/api/chat`, {}, body))) as OllamaResponse;
      return {
        text: res.message?.content ?? '',
        latencyMs: Date.now() - start,
        inputTokens: res.prompt_eval_count,
        outputTokens: res.eval_count,
      };
    },
  };
}
