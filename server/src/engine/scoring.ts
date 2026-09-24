import type { AccusationInput, CaseResult, ScoreBreakdownItem } from '@caso404/shared';
import type { CaseData } from '../case/schema';
import { GameError } from './errors';
import type { GameState } from './gameState';

// Pesos da pontuação final (somam 100).
export const WEIGHTS = {
  evidence: 15,
  lab: 10,
  interrogation: 20,
  timeline: 15,
  culprit: 25,
  motive: 5,
  method: 5,
  keyEvidence: 5,
} as const;

const found = (s: GameState, id: string) => {
  const st = s.evidence[id]?.status;
  return st !== undefined && st !== 'nao_descoberta' && st !== 'perdida';
};

/** Exames que de fato revelam algo (os que têm fatos associados). */
function productiveTests(c: CaseData) {
  return c.evidence.flatMap((e) =>
    Object.entries(e.lab)
      .filter(([, v]) => v?.facts?.length)
      .map(([test]) => `${e.id}:${test}`),
  );
}

/** Pontuação exibida no HUD durante a investigação. */
export function liveScore(s: GameState, c: CaseData): number {
  const evidence = c.evidence.filter((e) => found(s, e.id)).length * 3;
  const productive = new Set(productiveTests(c));
  const lab = s.lab.filter((l) => l.done && productive.has(`${l.evidenceId}:${l.test}`)).length * 2;
  const triggered = s.triggered.map((id) => c.contradictions.find((x) => x.id === id)!);
  const interrog = triggered.reduce((sum, x) => sum + (x.type === 'contradicao' ? 6 : 3), 0);
  return evidence + lab + interrog;
}

function ratioItem(label: string, got: number, total: number, max: number, detail: string): ScoreBreakdownItem {
  const points = total ? Math.round((max * got) / total) : 0;
  return { label, points, max, detail };
}

export function timelineAccuracy(s: GameState, c: CaseData) {
  const correct = c.timelineEvents.filter((ev) => s.board.timeline[ev.slotId] === ev.id).length;
  return { correct, total: c.timelineEvents.length };
}

export function computeResult(s: GameState, c: CaseData, acc: AccusationInput): CaseResult {
  const sol = c.solution;
  const breakdown: ScoreBreakdownItem[] = [];

  const evFound = c.evidence.filter((e) => found(s, e.id)).length;
  breakdown.push(ratioItem('Evidências encontradas', evFound, c.evidence.length, WEIGHTS.evidence, `${evFound} de ${c.evidence.length}`));

  const productive = productiveTests(c);
  const doneProductive = s.lab.filter((l) => l.done && productive.includes(`${l.evidenceId}:${l.test}`)).length;
  breakdown.push(ratioItem('Análises de laboratório relevantes', doneProductive, productive.length, WEIGHTS.lab, `${doneProductive} de ${productive.length}`));

  const totalX = c.contradictions.length;
  breakdown.push(ratioItem('Contradições e álibis esclarecidos', s.triggered.length, totalX, WEIGHTS.interrogation, `${s.triggered.length} de ${totalX}`));

  const tl = timelineAccuracy(s, c);
  breakdown.push(ratioItem('Precisão da linha do tempo', tl.correct, tl.total, WEIGHTS.timeline, `${tl.correct} de ${tl.total} eventos no horário certo`));

  const culpritOk = acc.suspectId === sol.culpritId;
  breakdown.push({ label: 'Culpado', points: culpritOk ? WEIGHTS.culprit : 0, max: WEIGHTS.culprit, detail: culpritOk ? 'Correto' : 'Incorreto' });
  const motiveOk = acc.motiveId === sol.motiveId;
  breakdown.push({ label: 'Motivo', points: motiveOk ? WEIGHTS.motive : 0, max: WEIGHTS.motive, detail: motiveOk ? 'Correto' : 'Incorreto' });
  const methodOk = acc.methodId === sol.methodId;
  breakdown.push({ label: 'Método', points: methodOk ? WEIGHTS.method : 0, max: WEIGHTS.method, detail: methodOk ? 'Correto' : 'Incorreto' });

  const chosen = [...new Set(acc.evidenceIds)].slice(0, 3);
  const goodKeys = chosen.filter((id) => sol.keyEvidence.includes(id) && found(s, id)).length;
  // Evidência-chave só conta se a acusação aponta o culpado certo.
  breakdown.push(
    ratioItem('Evidências-chave apresentadas', culpritOk ? goodKeys : 0, 3, WEIGHTS.keyEvidence, `${goodKeys} de 3 sustentam a acusação`),
  );

  const total = breakdown.reduce((a, b) => a + b.points, 0);
  const max = breakdown.reduce((a, b) => a + b.max, 0);
  const grade: CaseResult['grade'] = total >= 90 ? 'S' : total >= 75 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D';

  const culprit = c.characters.find((ch) => ch.id === sol.culpritId)!;
  return {
    correct: culpritOk,
    total,
    max,
    grade,
    breakdown,
    accusation: { ...acc, evidenceIds: chosen },
    solution: {
      culpritName: culprit.name,
      motive: c.motives.find((m) => m.id === sol.motiveId)!.label,
      method: c.methods.find((m) => m.id === sol.methodId)!.label,
    },
    reconstruction: sol.reconstruction,
  };
}

export function accuse(s: GameState, c: CaseData, acc: AccusationInput): CaseResult {
  if (s.finished && s.result) return s.result;
  const suspect = c.characters.find((ch) => ch.id === acc.suspectId && ch.suspect);
  if (!suspect) throw new GameError('Suspeito inválido.');
  if (!c.motives.some((m) => m.id === acc.motiveId)) throw new GameError('Motivo inválido.');
  if (!c.methods.some((m) => m.id === acc.methodId)) throw new GameError('Método inválido.');
  const result = computeResult(s, c, { ...acc, evidenceIds: (acc.evidenceIds ?? []).filter((id) => found(s, id)) });
  s.finished = true;
  s.result = result;
  s.log.push(`Acusação: ${suspect.name}. ${result.correct ? 'Culpado correto.' : 'Culpado incorreto.'} Nota ${result.grade} (${result.total}/100).`);
  return result;
}
