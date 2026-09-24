// Tipos compartilhados entre server e client.
// Tudo que está em "Case*" (sem "Public") pode conter segredo e só existe no servidor.

export const EMOTIONS = ['CALMO', 'NERVOSO', 'DEFENSIVO', 'IRRITADO', 'ABALADO'] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const LAB_TESTS = ['digitais', 'dna', 'substancias'] as const;
export type LabTest = (typeof LAB_TESTS)[number];

export const LAB_TEST_LABEL: Record<LabTest, string> = {
  digitais: 'Impressões digitais',
  dna: 'DNA',
  substancias: 'Substâncias (toxicologia)',
};

export type EvidenceStatus = 'nao_descoberta' | 'descoberta' | 'em_analise' | 'analisada' | 'perdida';

/** Minutos desde 00:00 do dia do crime (pode passar de 1440 = dia seguinte). */
export type ClockMinutes = number;

export function formatClock(min: ClockMinutes): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Conteúdo público do caso (enviado ao cliente)

export interface PublicCharacter {
  id: string;
  name: string;
  role: string;
  age: number;
  summary: string;
  portrait: string;
  isVictim?: boolean;
}

export interface PublicScene {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface PublicHotspot {
  id: string;
  sceneId: string;
  x: number; // % da largura
  y: number; // % da altura
  label: string;
  kind: 'evidence' | 'inspect';
  evidenceId?: string;
}

export interface PublicEvidence {
  id: string;
  name: string;
  description: string;
  image: string;
  sceneId: string;
}

export interface Option {
  id: string;
  label: string;
}

export interface TimelineSlot {
  id: string;
  time: ClockMinutes;
}

export interface PublicCase {
  id: string;
  title: string;
  tagline: string;
  briefing: string[];
  startClock: ClockMinutes;
  startSceneId: string;
  characters: PublicCharacter[];
  scenes: PublicScene[];
  hotspots: PublicHotspot[];
  evidence: PublicEvidence[];
  motives: Option[];
  methods: Option[];
  timelineSlots: TimelineSlot[];
  questionLimit: number;
}

// ---------------------------------------------------------------------------
// Estado da sessão como o cliente enxerga

export interface KnownFact {
  id: string;
  text: string;
  source: string; // "Cena", "Laboratório", "Interrogatório: João Silva"...
  about: string[];
  at: ClockMinutes;
}

export interface LabResultView {
  evidenceId: string;
  test: LabTest;
  status: 'em_analise' | 'concluido';
  readyAt: ClockMinutes;
  result?: string;
}

export interface EvidenceView {
  id: string;
  status: EvidenceStatus;
  discoveredAt?: ClockMinutes;
}

export interface DialogueLine {
  speaker: 'investigador' | 'suspeito' | 'sistema';
  text: string;
  gesture?: string;
  emotion?: Emotion;
  at: ClockMinutes;
  kind?: 'pergunta' | 'evidencia' | 'confronto' | 'contradicao' | 'confirmacao' | 'resposta';
}

export interface HeardClaim {
  id: string;
  suspectId: string;
  text: string;
}

export interface SuspectView {
  id: string;
  emotion: Emotion;
  questionsUsed: number;
  transcript: DialogueLine[];
}

export interface TimelineEventView {
  id: string;
  text: string;
}

export interface BoardState {
  /** slotId -> eventId */
  timeline: Record<string, string>;
  /** evidenceId -> suspectId[] */
  links: Record<string, string[]>;
  /** suspectId -> marcação do jogador */
  marks: Record<string, 'suspeito' | 'descartado' | 'neutro'>;
}

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  max: number;
  detail?: string;
}

export interface AccusationInput {
  suspectId: string;
  motiveId: string;
  methodId: string;
  evidenceIds: string[];
}

export interface CaseResult {
  correct: boolean;
  total: number;
  max: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  breakdown: ScoreBreakdownItem[];
  accusation: AccusationInput;
  solution: { culpritName: string; motive: string; method: string };
  reconstruction: string[];
}

export interface SessionView {
  id: string;
  caseId: string;
  clock: ClockMinutes;
  sceneId: string;
  evidence: Record<string, EvidenceView>;
  inspectedHotspots: string[];
  facts: KnownFact[];
  lab: LabResultView[];
  heardClaims: HeardClaim[];
  contradictionsFound: number;
  confirmationsFound: number;
  suspects: Record<string, SuspectView>;
  timelineEvents: TimelineEventView[];
  board: BoardState;
  liveScore: number;
  finished: boolean;
  result?: CaseResult;
  log: string[];
}

// ---------------------------------------------------------------------------
// DTOs da API

export interface HealthResponse {
  ok: true;
  provider: 'mock' | 'claude';
  model?: string;
}

export interface InspectResponse {
  session: SessionView;
  message: string;
  newFacts: KnownFact[];
}

export interface InterrogateRequest {
  suspectId: string;
  message?: string;
  evidenceId?: string;
  claimId?: string;
}

export interface InterrogateResponse {
  session: SessionView;
  lines: DialogueLine[];
  newFacts: KnownFact[];
  provider: 'mock' | 'claude' | 'engine';
}

export interface ApiError {
  error: string;
}
