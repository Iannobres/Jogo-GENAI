import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { EMOTIONS } from '@caso404/shared';
import { buildSystemPrompt, buildTurnMessage } from './promptBuilder';
import type { DialogueOutput, DialogueProvider, DialogueRequest } from './provider';

const ReplySchema = z.object({
  gesto: z.string().describe('Linguagem corporal curta, em 3ª pessoa'),
  fala: z.string().describe('O que o personagem diz, em 1ª pessoa, no máximo 3 frases'),
  emocao: z.enum(EMOTIONS),
});

export class ClaudeProvider implements DialogueProvider {
  readonly name = 'claude' as const;
  private client: Anthropic;

  constructor(readonly model: string) {
    this.client = new Anthropic({ maxRetries: 1, timeout: 45_000 });
  }

  async generate(req: DialogueRequest, feedback?: string): Promise<DialogueOutput> {
    const turn = buildTurnMessage(req);
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4000,
      // Resposta curta e rápida: interrogatório é tempo real. (Haiku 4.5 não aceita effort.)
      output_config: {
        ...(this.model.includes('haiku') ? {} : { effort: 'low' as const }),
        format: zodOutputFormat(ReplySchema),
      },
      system: [{ type: 'text', text: buildSystemPrompt(req), cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: feedback
            ? `${turn}\n\nATENÇÃO: sua resposta anterior foi rejeitada pelo motor do jogo (${feedback}). Corrija e responda de novo.`
            : turn,
        },
      ],
    });
    if (response.stop_reason === 'refusal') throw new Error('O modelo recusou a resposta.');
    if (!response.parsed_output) throw new Error(`Saída não estruturada (stop_reason: ${response.stop_reason}).`);
    return response.parsed_output;
  }
}
