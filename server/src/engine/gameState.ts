import {
  LAB_TEST_LABEL,
  formatClock,
  type BoardState,
  type CaseResult,
  type DialogueLine,
  type Emotion,
  type EvidenceStatus,
  type KnownFact,
  type LabTest,
  type SessionView,
} from '@caso404/shared';
import type { CaseData } from '../case/schema';
import { GameError } from './errors';
import { liveScore } from './scoring';

export { GameError };

/** Estado completo da sessão, só no servidor. É ele que vai para o arquivo de save. */
export interface GameState {
  id: string;
  caseId: string;
  createdAt: string;
  clock: number;
  sceneId: string;
  evidence: Record<string, { status: EvidenceStatus; discoveredAt?: number }>;
  inspected: string[];
  facts: { id: string; source: string; at: number }[];
  lab: { evidenceId: string; test: LabTest; readyAt: number; done: boolean }[];
  heardClaims: string[];
  triggered: string[];
  suspects: Record<string, { emotion: Emotion; questionsUsed: number; transcript: DialogueLine[] }>;
  board: BoardState;
  finished: boolean;
  result?: CaseResult;
  log: string[];
}

export function createState(c: CaseData, id: string): GameState {
  const suspects: GameState['suspects'] = {};
  for (const ch of c.characters) {
    if (ch.suspect) suspects[ch.id] = { emotion: ch.suspect.emotionBaseline, questionsUsed: 0, transcript: [] };
  }
  const evidence: GameState['evidence'] = {};
  for (const e of c.evidence) evidence[e.id] = { status: 'nao_descoberta' };
  return {
    id,
    caseId: c.id,
    createdAt: new Date().toISOString(),
    clock: c.startClock,
    sceneId: c.startSceneId,
    evidence,
    inspected: [],
    facts: [],
    lab: [],
    heardClaims: [],
    triggered: [],
    suspects,
    board: { timeline: {}, links: {}, marks: {} },
    finished: false,
    log: [`${formatClock(c.startClock)}: investigação iniciada.`],
  };
}

function ensureOpen(s: GameState) {
  if (s.finished) throw new GameError('O caso já foi encerrado.');
}

export function knowsFact(s: GameState, factId: string): boolean {
  return s.facts.some((f) => f.id === factId);
}

/** Registra um fato como conhecido. Devolve o KnownFact se for novo. */
export function grantFact(s: GameState, c: CaseData, factId: string, source: string): KnownFact | null {
  if (knowsFact(s, factId)) return null;
  const fact = c.facts.find((f) => f.id === factId);
  if (!fact) throw new Error(`Fato inexistente: ${factId}`);
  s.facts.push({ id: factId, source, at: s.clock });
  return { id: fact.id, text: fact.text, about: fact.about, source, at: s.clock };
}

function evidenceStatusFromLab(s: GameState, evidenceId: string): EvidenceStatus {
  const tests = s.lab.filter((l) => l.evidenceId === evidenceId);
  if (tests.some((t) => !t.done)) return 'em_analise';
  if (tests.length) return 'analisada';
  return 'descoberta';
}

/** Avança o relógio e processa o que depende de tempo (laboratório e evidências que se perdem). */
export function advance(s: GameState, c: CaseData, minutes: number): KnownFact[] {
  s.clock += minutes;
  const newFacts: KnownFact[] = [];
  for (const job of s.lab) {
    if (job.done || s.clock < job.readyAt) continue;
    job.done = true;
    const ev = c.evidence.find((e) => e.id === job.evidenceId)!;
    s.evidence[ev.id].status = evidenceStatusFromLab(s, ev.id);
    s.log.push(`${formatClock(job.readyAt)}: laudo de ${LAB_TEST_LABEL[job.test].toLowerCase()} pronto (${ev.name}).`);
    for (const f of ev.lab[job.test]?.facts ?? []) {
      const kf = grantFact(s, c, f, 'Laboratório');
      if (kf) newFacts.push(kf);
    }
  }
  for (const ev of c.evidence) {
    const st = s.evidence[ev.id];
    if (ev.expiresAt !== undefined && st.status === 'nao_descoberta' && s.clock >= ev.expiresAt) {
      st.status = 'perdida';
      s.log.push(`${formatClock(ev.expiresAt)}: uma evidência se perdeu antes de ser coletada.`);
    }
  }
  return newFacts;
}

export function moveScene(s: GameState, c: CaseData, sceneId: string): KnownFact[] {
  ensureOpen(s);
  const scene = c.scenes.find((sc) => sc.id === sceneId);
  if (!scene) throw new GameError('Local inexistente.');
  if (s.sceneId === sceneId) return [];
  s.sceneId = sceneId;
  return advance(s, c, c.costs.move);
}

export function inspect(s: GameState, c: CaseData, hotspotId: string): { message: string; newFacts: KnownFact[] } {
  ensureOpen(s);
  const h = c.hotspots.find((hs) => hs.id === hotspotId);
  if (!h) throw new GameError('Ponto de interesse inexistente.');
  if (h.sceneId !== s.sceneId) throw new GameError('Esse ponto não está no local atual.');

  const first = !s.inspected.includes(h.id);
  const newFacts: KnownFact[] = [];

  if (h.kind === 'evidence') {
    const ev = c.evidence.find((e) => e.id === h.evidenceId)!;
    // Checa expiração antes de coletar: o tempo pode ter passado exatamente agora.
    if (first) newFacts.push(...advance(s, c, c.costs.inspect));
    const st = s.evidence[ev.id];
    if (!s.inspected.includes(h.id)) s.inspected.push(h.id);
    if (st.status === 'perdida') return { message: ev.lostText ?? 'Não há mais nada aqui.', newFacts };
    if (st.status === 'nao_descoberta') {
      st.status = 'descoberta';
      st.discoveredAt = s.clock;
      s.log.push(`${formatClock(s.clock)}: evidência coletada (${ev.name}).`);
      for (const f of ev.facts) {
        const kf = grantFact(s, c, f, `Cena: ${ev.name}`);
        if (kf) newFacts.push(kf);
      }
      return { message: `Evidência coletada: ${ev.name}. ${ev.description}`, newFacts };
    }
    return { message: `${ev.name}: ${ev.description}`, newFacts };
  }

  if (first) {
    s.inspected.push(h.id);
    newFacts.push(...advance(s, c, c.costs.inspect));
    for (const f of h.facts ?? []) {
      const kf = grantFact(s, c, f, `Cena: ${h.label}`);
      if (kf) newFacts.push(kf);
    }
  }
  return { message: h.text ?? h.label, newFacts };
}

export function sendToLab(s: GameState, c: CaseData, evidenceId: string, test: LabTest): KnownFact[] {
  ensureOpen(s);
  const ev = c.evidence.find((e) => e.id === evidenceId);
  if (!ev) throw new GameError('Evidência inexistente.');
  const st = s.evidence[ev.id];
  if (st.status === 'nao_descoberta' || st.status === 'perdida') throw new GameError('Essa evidência não foi coletada.');
  if (s.lab.some((l) => l.evidenceId === ev.id && l.test === test)) throw new GameError('Esse exame já foi solicitado.');
  const newFacts = advance(s, c, c.costs.labSend);
  s.lab.push({ evidenceId: ev.id, test, readyAt: s.clock + c.costs.labDuration, done: false });
  st.status = 'em_analise';
  s.log.push(`${formatClock(s.clock)}: ${ev.name} enviada para exame de ${LAB_TEST_LABEL[test].toLowerCase()}.`);
  return newFacts;
}

/** Avança o relógio até o próximo laudo ficar pronto. */
export function waitForLab(s: GameState, c: CaseData): KnownFact[] {
  ensureOpen(s);
  const pending = s.lab.filter((l) => !l.done);
  if (!pending.length) throw new GameError('Não há exames pendentes.');
  const next = Math.min(...pending.map((l) => l.readyAt));
  return advance(s, c, Math.max(0, next - s.clock));
}

export function labResultText(c: CaseData, evidenceId: string, test: LabTest): string {
  const ev = c.evidence.find((e) => e.id === evidenceId);
  return ev?.lab[test]?.result ?? 'Nenhum resultado relevante para este exame.';
}

export function unlockedEvents(s: GameState, c: CaseData) {
  return c.timelineEvents.filter((ev) => ev.unlockedBy.some((f) => knowsFact(s, f)));
}

export function updateBoard(s: GameState, c: CaseData, board: BoardState): void {
  ensureOpen(s);
  const events = new Set(unlockedEvents(s, c).map((e) => e.id));
  const slots = new Set(c.timelineSlots.map((sl) => sl.id));
  const suspects = new Set(Object.keys(s.suspects));
  const timeline: BoardState['timeline'] = {};
  const used = new Set<string>();
  for (const [slotId, eventId] of Object.entries(board.timeline ?? {})) {
    if (!slots.has(slotId) || !events.has(eventId) || used.has(eventId)) continue;
    timeline[slotId] = eventId;
    used.add(eventId);
  }
  const links: BoardState['links'] = {};
  for (const [evidenceId, sus] of Object.entries(board.links ?? {})) {
    const st = s.evidence[evidenceId]?.status;
    if (!st || st === 'nao_descoberta' || st === 'perdida' || !Array.isArray(sus)) continue;
    const valid = [...new Set(sus.filter((id) => suspects.has(id)))];
    if (valid.length) links[evidenceId] = valid;
  }
  const marks: BoardState['marks'] = {};
  for (const [id, mark] of Object.entries(board.marks ?? {})) {
    if (suspects.has(id) && ['suspeito', 'descartado', 'neutro'].includes(mark)) marks[id] = mark;
  }
  s.board = { timeline, links, marks };
}

export function toSessionView(s: GameState, c: CaseData): SessionView {
  const factById = new Map(c.facts.map((f) => [f.id, f]));
  return {
    id: s.id,
    caseId: s.caseId,
    clock: s.clock,
    sceneId: s.sceneId,
    evidence: Object.fromEntries(Object.entries(s.evidence).map(([id, e]) => [id, { id, ...e }])),
    inspectedHotspots: s.inspected,
    facts: s.facts.map((f) => {
      const fact = factById.get(f.id)!;
      return { id: f.id, text: fact.text, about: fact.about, source: f.source, at: f.at };
    }),
    lab: s.lab.map((l) => ({
      evidenceId: l.evidenceId,
      test: l.test,
      status: l.done ? 'concluido' : 'em_analise',
      readyAt: l.readyAt,
      ...(l.done ? { result: labResultText(c, l.evidenceId, l.test) } : {}),
    })),
    heardClaims: s.heardClaims.map((id) => {
      const cl = c.claims.find((x) => x.id === id)!;
      return { id, suspectId: cl.suspectId, text: cl.text };
    }),
    contradictionsFound: s.triggered.filter((id) => c.contradictions.find((x) => x.id === id)?.type === 'contradicao').length,
    confirmationsFound: s.triggered.filter((id) => c.contradictions.find((x) => x.id === id)?.type === 'confirmacao').length,
    suspects: Object.fromEntries(Object.entries(s.suspects).map(([id, sv]) => [id, { id, ...sv }])),
    timelineEvents: unlockedEvents(s, c).map((e) => ({ id: e.id, text: e.text })),
    board: s.board,
    liveScore: liveScore(s, c),
    finished: s.finished,
    ...(s.result ? { result: s.result } : {}),
    log: s.log.slice(-30),
  };
}
