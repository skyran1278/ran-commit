export interface LLMStrategy {
  sendRequest(prompt: string): Promise<string>;
  /**
   * Input token budget the backend enforces. Only backends that expose a limit
   * implement this; when absent the prompt is sent unmodified.
   */
  readonly maxInputTokens?: number;
  /** Token count for `text`, for backends that can measure it. */
  countTokens?(text: string): Promise<number>;
}

export { ClaudeCliStrategy } from './claude-cli';
export { PerplexityStrategy } from './perplexity';
export { VscodeLmStrategy } from './vscode-lm';
