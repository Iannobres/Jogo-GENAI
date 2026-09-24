import { EMOTIONS, type Emotion } from '@caso404/shared';
import type { CaseData } from '../case/schema';
import { unknownProperNames } from '../engine/interrogation';
import type { DialogueOutput, DialogueRequest } from './provider';

export interface ValidationResult {
  ok: boolean;
  problems: string[];
  /** Saída saneada (emoção corrigida, texto aparado). */
  output: { fala: string; gesto?: string; emocao: Emotion };
}

const CONFESSION = /\b(eu\s+(o\s+|te\s+|lhe\s+)?(matei|envenenei|assassinei)|fui\s+eu\s+(que|quem)\s+(o\s+)?(matou|matei|envenenou|envenenei)|confesso\s+(que\s+)?(o\s+)?(crime|assassinato|matei|envenenei))\b/i;
const TIME = /\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/gi;

function timesIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(TIME)) out.add(`${Number(m[1])}:${m[2] ?? '00'}`);
  return out;
}

/**
 * Confere a fala gerada contra o estado do jogo antes de mostrá-la ao jogador:
 * nada de confissão, nomes fora do caso, horários que o personagem não conhece
 * ou tamanho exagerado. A emoção fora do enum vira a emoção decidida pelo engine.
 */
export function validateOutput(
  c: CaseData,
  req: DialogueRequest,
  raw: DialogueOutput,
  engineEmotion: Emotion,
  forceEmotion: boolean,
): ValidationResult {
  const problems: string[] = [];
  const fala = (raw.fala ?? '').trim().replace(/^["“]|["”]$/g, '');
  const gesto = raw.gesto?.trim().slice(0, 120) || undefined;

  if (!fala) problems.push('fala vazia');
  if (fala.length > 700) problems.push('fala longa demais (máx. 3 frases curtas)');
  if (CONFESSION.test(fala)) problems.push('o personagem não pode confessar o homicídio');

  const strangers = unknownProperNames(c, fala);
  if (strangers.length) problems.push(`nomes que não existem no caso: ${strangers.join(', ')}`);

  const p = req.character.suspect!;
  const allowedTimes = timesIn(
    [...p.knowledge, ...p.lies, req.directive, req.reference.text, req.playerText, ...req.admitted, '23h40'].join(' '),
  );
  const badTimes = [...timesIn(fala)].filter((t) => !allowedTimes.has(t));
  if (badTimes.length) problems.push(`horários fora do roteiro: ${badTimes.join(', ')}`);

  const emocao = !forceEmotion && EMOTIONS.includes(raw.emocao as Emotion) ? (raw.emocao as Emotion) : engineEmotion;
  return { ok: problems.length === 0, problems, output: { fala: fala.slice(0, 700), gesto, emocao } };
}
