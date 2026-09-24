import type { DialogueLine, Emotion } from '@caso404/shared';
import type { CaseCharacter } from '../case/schema';

export interface DialogueRequest {
  character: CaseCharacter;
  /** Fatos que este suspeito já admitiu ao investigador. */
  admitted: string[];
  emotion: Emotion;
  directive: string;
  reference: { gesture?: string; text: string };
  history: DialogueLine[];
  playerText: string;
}

export interface DialogueOutput {
  fala: string;
  gesto?: string;
  emocao?: string;
}

export interface DialogueProvider {
  readonly name: 'mock' | 'claude';
  readonly model?: string;
  generate(req: DialogueRequest, feedback?: string): Promise<DialogueOutput>;
}
