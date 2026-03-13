import { LLMStrategy } from './index';

export class PerplexityStrategy implements LLMStrategy {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'perplexity/sonar',
  ) {}

  async sendRequest(prompt: string): Promise<string> {
    const response = await fetch('https://api.perplexity.ai/v1/agent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      output: [{ content: [{ text: string }] }];
    };
    return data.output[0].content[0].text;
  }
}
