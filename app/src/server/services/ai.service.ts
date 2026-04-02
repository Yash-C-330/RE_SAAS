import OpenAI from "openai";

export class AIService {
  private readonly client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.client = new OpenAI({ apiKey });
  }

  async generateText(params: { tenantId: string; prompt: string; model?: string }) {
    const completion = await this.client.chat.completions.create({
      model: params.model ?? "gpt-4o-mini",
      messages: [{ role: "user", content: params.prompt }],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const totalTokens = completion.usage?.total_tokens ?? 0;

    return {
      tenantId: params.tenantId,
      text: content,
      model: completion.model,
      totalTokens,
      estimatedCost: Number(((totalTokens / 1000) * 0.0006).toFixed(6)),
    };
  }
}
