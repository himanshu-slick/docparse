export interface CompletionRequest {
  system: string;
  prompt: string;
}

export interface CompletionResult {
  text: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

/** USD per million tokens at list price. Actual spend on free tiers is zero. */
export interface Pricing {
  inputPerM: number;
  outputPerM: number;
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  readonly pricing: Pricing;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
