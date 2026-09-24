import type { Emotion, KnownFact } from '@caso404/shared';
import type { CaseContradiction, CaseData, MockLine } from '../case/schema';
import { GameError } from './errors';
import { advance, grantFact, knowsFact, type GameState } from './gameState';

/**
 * Decide, de forma determinística, o que acontece numa jogada de interrogatório.
 * O LLM só recebe o "plano" pronto (diretiva + fala de referência) e escreve a fala final.
 * Contradições, fatos liberados e estado emocional nunca dependem do texto do modelo.
 */
export interface TurnPlan {
  suspectId: string;
  kind: 'pergunta' | 'evidencia' | 'confronto';
  playerText: string;
  intent: string | null;
  directive: string;
  reference: { gesture?: string; text: string };
  emotion: Emotion;
  outcome: 'contradicao' | 'confirmacao' | null;
  /** Resposta controlada pelo backend: não chama o LLM. */
  canned: boolean;
  systemNote?: string;
  newFacts: KnownFact[];
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escolhe o tema da pergunta por palavras-chave (prefixo de palavra). Empate: ordem do caso. */
export function detectIntent(c: CaseData, text: string): string | null {
  const padded = ` ${normalize(text)} `;
  let best: string | null = null;
  let bestScore = 0;
  for (const intent of c.intents) {
    const score = intent.keywords.filter((kw) => padded.includes(` ${normalize(kw)}${kw.endsWith(' ') ? ' ' : ''}`)).length;
    if (score > bestScore) {
      best = intent.id;
      bestScore = score;
    }
  }
  return best;
}

const COMMON_CAPITALIZED = new Set(['Sala', 'Dr', 'Dra', 'Dona', 'Seu', 'Sr', 'Sra', 'Deus', 'Campinas', 'TI', 'Contratos', 'Investimentos']);

/** Nomes próprios do caso (primeiro nome e sobrenome de cada personagem). */
export function caseNames(c: CaseData): Set<string> {
  const names = new Set<string>(COMMON_CAPITALIZED);
  for (const ch of c.characters) ch.name.split(/\s+/).forEach((p) => names.add(p));
  return names;
}

/**
 * Procura palavras com inicial maiúscula no meio da frase que não sejam nomes do caso.
 * Serve tanto para perguntas sobre pessoas inexistentes quanto para validar a saída do LLM.
 */
export function unknownProperNames(c: CaseData, text: string): string[] {
  const known = caseNames(c);
  const found: string[] = [];
  const sentences = text.split(/[.!?…:"“”\n]+/);
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    words.slice(1).forEach((raw) => {
      const w = raw.replace(/[^\p{L}]/gu, '');
      if (w.length > 2 && /^\p{Lu}\p{Ll}+$/u.test(w) && !known.has(w)) found.push(w);
    });
  }
  return found;
}

function suspectOf(c: CaseData, s: GameState, suspectId: string) {
  const ch = c.characters.find((x) => x.id === suspectId);
  if (!ch?.suspect || !s.suspects[suspectId]) throw new GameError('Suspeito inexistente.', 404);
  return ch;
}

function mockFor(c: CaseData, suspectId: string, key: string): MockLine | undefined {
  return c.mockDialogue[suspectId]?.[key];
}

function referenceText(s: GameState, line: MockLine): string {
  let text = line.text;
  for (const [factId, alt] of Object.entries(line.after ?? {})) if (knowsFact(s, factId)) text = alt;
  return text;
}

function hearClaim(s: GameState, claimId: string) {
  if (!s.heardClaims.includes(claimId)) s.heardClaims.push(claimId);
}

function basePlan(
  s: GameState,
  suspectId: string,
  kind: TurnPlan['kind'],
  playerText: string,
): Omit<TurnPlan, 'directive' | 'reference'> {
  return { suspectId, kind, playerText, intent: null, emotion: s.suspects[suspectId].emotion, outcome: null, canned: false, newFacts: [] };
}

/** Consome uma pergunta do limite e avança o relógio. Devolve plano "limite" se acabou. */
function spendQuestion(s: GameState, c: CaseData, suspectId: string, kind: TurnPlan['kind'], playerText: string): TurnPlan | { newFacts: KnownFact[] } {
  if (s.finished) throw new GameError('O caso já foi encerrado.');
  const sv = s.suspects[suspectId];
  if (sv.questionsUsed >= c.questionLimit) {
    const limit = mockFor(c, suspectId, 'limit')!;
    return {
      ...basePlan(s, suspectId, kind, playerText),
      directive: 'Recuse-se a continuar o interrogatório.',
      reference: { gesture: limit.gesture, text: limit.text },
      canned: true,
      systemNote: 'Limite de perguntas atingido para este suspeito.',
    };
  }
  sv.questionsUsed += 1;
  return { newFacts: advance(s, c, c.costs.question) };
}

function trigger(s: GameState, c: CaseData, x: CaseContradiction, plan: TurnPlan): TurnPlan {
  const ch = c.characters.find((cc) => cc.id === x.suspectId)!;
  s.triggered.push(x.id);
  for (const f of x.factsUnlocked) {
    const kf = grantFact(s, c, f, `Interrogatório: ${ch.name}`);
    if (kf) plan.newFacts.push(kf);
  }
  x.claimsUnlocked?.forEach((cl) => hearClaim(s, cl));
  s.suspects[x.suspectId].emotion = x.emotionAfter;
  return {
    ...plan,
    directive: x.directive,
    reference: x.mock,
    emotion: x.emotionAfter,
    outcome: x.type,
    systemNote: x.type === 'contradicao' ? 'Contradição exposta!' : 'Álibi confirmado.',
  };
}

export function planQuestion(s: GameState, c: CaseData, suspectId: string, message: string): TurnPlan {
  const ch = suspectOf(c, s, suspectId);
  const text = message.trim().slice(0, 500);
  if (!text) throw new GameError('Escreva uma pergunta.');
  const spent = spendQuestion(s, c, suspectId, 'pergunta', text);
  if ('canned' in spent) return spent;

  const plan: TurnPlan = {
    ...basePlan(s, suspectId, 'pergunta', text),
    directive: '',
    reference: { text: '' },
    newFacts: spent.newFacts,
  };

  const strangers = unknownProperNames(c, text);
  if (strangers.length) {
    return {
      ...plan,
      canned: true,
      directive: '',
      reference: { gesture: 'franze a testa', text: `${strangers[0]}? Não conheço ninguém com esse nome, investigador.` },
      systemNote: 'Esse nome não faz parte do caso.',
    };
  }

  const intent = detectIntent(c, text);
  const line = (intent && mockFor(c, suspectId, intent)) || mockFor(c, suspectId, 'fallback')!;
  const parts: string[] = [];
  if (intent && line !== mockFor(c, suspectId, 'fallback')) {
    parts.push(`Tema da pergunta: ${intent}.`);
    if (line.claim) {
      hearClaim(s, line.claim);
      const claim = c.claims.find((cl) => cl.id === line.claim)!;
      parts.push(`Nesta resposta, sustente com suas palavras a afirmação: "${claim.text}"`);
    }
    if (line.fact) {
      const kf = grantFact(s, c, line.fact, `Interrogatório: ${ch.name}`);
      if (kf) plan.newFacts.push(kf);
      parts.push(`Você pode revelar: "${c.facts.find((f) => f.id === line.fact)!.text}"`);
    }
  } else {
    parts.push('A pergunta não corresponde a nenhum tema do roteiro. Responda de forma evasiva e em personagem, sem inventar fatos.');
  }
  if (line.emotion && ['CALMO', ch.suspect!.emotionBaseline].includes(s.suspects[suspectId].emotion)) {
    s.suspects[suspectId].emotion = line.emotion;
  }
  return {
    ...plan,
    intent,
    directive: parts.join(' '),
    reference: { gesture: line.gesture, text: referenceText(s, line) },
    emotion: s.suspects[suspectId].emotion,
  };
}

function requireFoundEvidence(s: GameState, c: CaseData, evidenceId: string) {
  const ev = c.evidence.find((e) => e.id === evidenceId);
  const st = s.evidence[evidenceId]?.status;
  if (!ev || !st || st === 'nao_descoberta' || st === 'perdida') throw new GameError('Você não tem essa evidência.');
  return ev;
}

/** "Mostrar evidência": dispara a contradição correspondente se o suspeito já fez a declaração. */
export function planShowEvidence(s: GameState, c: CaseData, suspectId: string, evidenceId: string): TurnPlan {
  suspectOf(c, s, suspectId);
  const ev = requireFoundEvidence(s, c, evidenceId);
  const playerText = `[Mostra: ${ev.name}]`;
  const spent = spendQuestion(s, c, suspectId, 'evidencia', playerText);
  if ('canned' in spent) return spent;
  const plan: TurnPlan = { ...basePlan(s, suspectId, 'evidencia', playerText), directive: '', reference: { text: '' }, newFacts: spent.newFacts };

  const candidates = c.contradictions.filter(
    (x) => x.suspectId === suspectId && x.evidenceId === evidenceId && !s.triggered.includes(x.id),
  );
  const ready = candidates.find((x) => s.heardClaims.includes(x.claimId) && (!x.requiresFact || knowsFact(s, x.requiresFact)));
  if (ready) return trigger(s, c, ready, plan);

  const generic = mockFor(c, suspectId, 'evidence')!;
  const needsLab = candidates.find((x) => s.heardClaims.includes(x.claimId) && x.requiresFact && !knowsFact(s, x.requiresFact));
  return {
    ...plan,
    directive: `O investigador mostra a evidência "${ev.name}" (${ev.description}). Reaja em personagem sem admitir nada novo e sem inventar fatos.`,
    reference: { gesture: generic.gesture, text: generic.text },
    ...(needsLab ? { systemNote: 'Essa evidência parece importante para este suspeito. Uma análise de laboratório pode sustentar o confronto.' } : {}),
  };
}

/** "Confrontar contradição": o jogador escolhe uma declaração ouvida e uma evidência. */
export function planConfront(s: GameState, c: CaseData, suspectId: string, claimId: string, evidenceId: string): TurnPlan {
  suspectOf(c, s, suspectId);
  const claim = c.claims.find((cl) => cl.id === claimId && cl.suspectId === suspectId);
  if (!claim || !s.heardClaims.includes(claimId)) throw new GameError('Esse suspeito ainda não fez essa declaração.');
  const ev = requireFoundEvidence(s, c, evidenceId);
  const playerText = `"Você disse: '${claim.text}' Mas veja isto: ${ev.name}."`;
  const spent = spendQuestion(s, c, suspectId, 'confronto', playerText);
  if ('canned' in spent) return spent;
  const plan: TurnPlan = { ...basePlan(s, suspectId, 'confronto', playerText), directive: '', reference: { text: '' }, newFacts: spent.newFacts };

  const match = c.contradictions.find((x) => x.suspectId === suspectId && x.claimId === claimId && x.evidenceId === evidenceId);
  if (match && s.triggered.includes(match.id)) {
    return { ...plan, canned: true, reference: { gesture: 'suspira', text: 'Já falamos sobre isso, investigador.' }, systemNote: 'Esse ponto já foi esclarecido.' };
  }
  if (match && (!match.requiresFact || knowsFact(s, match.requiresFact))) return trigger(s, c, match, plan);

  const wrong = mockFor(c, suspectId, 'wrongConfront')!;
  return {
    ...plan,
    directive: `O investigador tenta usar a evidência "${ev.name}" contra a sua afirmação "${claim.text}", mas ela não a contradiz. Mantenha sua versão com firmeza, sem inventar fatos.`,
    reference: { gesture: wrong.gesture, text: wrong.text },
    systemNote: match
      ? 'A ligação faz sentido, mas falta uma prova técnica. Tente o laboratório.'
      : 'Essa evidência não contradiz essa declaração.',
  };
}
