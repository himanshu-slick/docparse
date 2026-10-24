import { gemini } from './gemini.js';
import { groqGptOss, groqQwen } from './groq.js';
import { ollama } from './ollama.js';
import type { Provider } from './types.js';

export type { CompletionRequest, CompletionResult, Pricing, Provider } from './types.js';

const FACTORIES: Record<string, () => Provider> = {
  gemini,
  'groq-gpt-oss': groqGptOss,
  'groq-qwen': groqQwen,
  ollama,
};

export const PROVIDER_NAMES = Object.keys(FACTORIES);

export function getProvider(name: string): Provider {
  const factory = FACTORIES[name];
  if (!factory) throw new Error(`unknown model "${name}"; choose one of: ${PROVIDER_NAMES.join(', ')}`);
  return factory();
}
