import * as vscode from 'vscode';

import { LLMStrategy } from './index';

export class VscodeLmStrategy implements LLMStrategy {
  constructor(
    private readonly model: vscode.LanguageModelChat,
    private readonly token: vscode.CancellationToken,
  ) {}

  get maxInputTokens(): number {
    return this.model.maxInputTokens;
  }

  async countTokens(text: string): Promise<number> {
    return this.model.countTokens(text, this.token);
  }

  async sendRequest(prompt: string): Promise<string> {
    const response = await this.model.sendRequest(
      [vscode.LanguageModelChatMessage.User(prompt)],
      {},
      this.token,
    );
    let text = '';
    for await (const chunk of response.text) {
      text += chunk;
    }
    return text;
  }
}
