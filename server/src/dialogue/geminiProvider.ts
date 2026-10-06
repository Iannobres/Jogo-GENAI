import { z } from 'zod';
import { EMOTIONS } from '@caso404/shared';
import { buildSystemPrompt, buildTurnMessage } from './promptBuilder';
import type { DialogueOutput, DialogueProvider, DialogueRequest } from './provider';

const ReplySchema = z.object({
  gesto: z.string(),
  fala: z.string(),
  emocao: z.enum(EMOTIONS),
});

// Schema no formato OpenAPI aceito pelo Gemini (responseSchema).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    gesto: { type: 'STRING', description: 'Linguagem corporal curta, em 3ª pessoa' },
    fala: { type: 'STRING', description: 'O que o personagem diz, em 1ª pessoa, no máximo 3 frases' },
    emocao: { type: 'STRING', enum: [...EMOTIONS] },
  },
  required: ['gesto', 'fala', 'emocao'],
  propertyOrdering: ['gesto', 'fala', 'emocao'],
};

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string };
}

export class GeminiProvider implements DialogueProvider {
  readonly name = 'gemini' as const;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  async generate(req: DialogueRequest, feedback?: string): Promise<DialogueOutput> {
    const turn = buildTurnMessage(req);
    const body = {
      systemInstruction: { parts: [{ text: buildSystemPrompt(req) }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: feedback
                ? `${turn}\n\nATENÇÃO: sua resposta anterior foi rejeitada pelo motor do jogo (${feedback}). Corrija e responda de novo.`
                : turn,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.8,
        maxOutputTokens: 1024,
        // Interrogatório é tempo real: raciocínio mínimo para responder rápido.
        thinkingConfig: this.model.startsWith('gemini-2.5') ? { thinkingBudget: 0 } : { thinkingLevel: 'low' },
      },
    };

    const data = await this.post(body);
    if (data.promptFeedback?.blockReason) throw new Error(`Gemini bloqueou o prompt (${data.promptFeedback.blockReason}).`);
    const cand = data.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error(`Saída vazia do Gemini (finishReason: ${cand?.finishReason ?? '?'}).`);
    const parsed = ReplySchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new Error(`Saída não estruturada (finishReason: ${cand?.finishReason ?? '?'}).`);
    return parsed.data;
  }

  /** Uma nova tentativa em caso de sobrecarga (429/503), com timeout por chamada. */
  private async post(body: unknown): Promise<GeminiResponse> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${ENDPOINT}/${this.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await res.json().catch(() => ({}))) as GeminiResponse;
      if (res.ok) return data;
      if (attempt === 0 && (res.status === 429 || res.status === 503)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw new Error(`Gemini ${res.status}: ${data.error?.message ?? res.statusText}`);
    }
  }
}
