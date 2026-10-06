import { z } from 'zod';
import { EMOTIONS, LAB_TESTS } from '@caso404/shared';

// Formato completo (com segredos) do arquivo case-data/<caso>/case.json.

const emotion = z.enum(EMOTIONS);

const mockLine = z.object({
  gesture: z.string().optional(),
  text: z.string(),
  /** declaração (claim) que o suspeito faz ao falar deste tema */
  claim: z.string().optional(),
  /** fato que o jogador aprende ao perguntar sobre este tema */
  fact: z.string().optional(),
  emotion: emotion.optional(),
  /** falas alternativas quando o jogador já conhece um fato (factId -> fala) */
  after: z.record(z.string(), z.string()).optional(),
});

const suspectProfile = z.object({
  isCulprit: z.boolean(),
  emotionBaseline: emotion,
  personality: z.string(),
  knowledge: z.array(z.string()),
  lies: z.array(z.string()),
  visual: z.string(),
});

const labEntry = z.object({ result: z.string(), facts: z.array(z.string()).optional() });

export const caseSchema = z.object({
  id: z.string(),
  title: z.string(),
  tagline: z.string(),
  briefing: z.array(z.string()),
  startClock: z.number(),
  startSceneId: z.string(),
  questionLimit: z.number().int().positive(),
  costs: z.object({
    move: z.number(),
    inspect: z.number(),
    question: z.number(),
    labSend: z.number(),
    labDuration: z.number(),
  }),
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      age: z.number(),
      summary: z.string(),
      portrait: z.string(),
      isVictim: z.boolean().optional(),
      suspect: suspectProfile.optional(),
    }),
  ),
  scenes: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), image: z.string() })),
  hotspots: z.array(
    z.object({
      id: z.string(),
      sceneId: z.string(),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      /** Largura e altura da área clicável, em % da cena (centro em x/y). */
      w: z.number().min(1).max(100).optional(),
      h: z.number().min(1).max(100).optional(),
      label: z.string(),
      kind: z.enum(['evidence', 'inspect']),
      evidenceId: z.string().optional(),
      text: z.string().optional(),
      facts: z.array(z.string()).optional(),
    }),
  ),
  evidence: z.array(
    z.object({
      id: z.string(),
      sceneId: z.string(),
      name: z.string(),
      description: z.string(),
      image: z.string(),
      facts: z.array(z.string()),
      expiresAt: z.number().optional(),
      lostText: z.string().optional(),
      lab: z.object({ digitais: labEntry.optional(), dna: labEntry.optional(), substancias: labEntry.optional() }),
    }),
  ),
  facts: z.array(z.object({ id: z.string(), text: z.string(), about: z.array(z.string()) })),
  intents: z.array(z.object({ id: z.string(), keywords: z.array(z.string()) })),
  claims: z.array(z.object({ id: z.string(), suspectId: z.string(), text: z.string(), intents: z.array(z.string()) })),
  contradictions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['contradicao', 'confirmacao']),
      suspectId: z.string(),
      claimId: z.string(),
      evidenceId: z.string(),
      requiresFact: z.string().optional(),
      factsUnlocked: z.array(z.string()),
      claimsUnlocked: z.array(z.string()).optional(),
      emotionAfter: emotion,
      directive: z.string(),
      mock: z.object({ gesture: z.string().optional(), text: z.string() }),
    }),
  ),
  mockDialogue: z.record(
    z.string(),
    z.object({
      fallback: mockLine,
      evidence: mockLine,
      wrongConfront: mockLine,
      limit: mockLine,
    }).catchall(mockLine),
  ),
  timelineSlots: z.array(z.object({ id: z.string(), time: z.number() })),
  timelineEvents: z.array(
    z.object({ id: z.string(), text: z.string(), unlockedBy: z.array(z.string()), slotId: z.string() }),
  ),
  motives: z.array(z.object({ id: z.string(), label: z.string() })),
  methods: z.array(z.object({ id: z.string(), label: z.string() })),
  solution: z.object({
    culpritId: z.string(),
    motiveId: z.string(),
    methodId: z.string(),
    keyEvidence: z.array(z.string()),
    reconstruction: z.array(z.string()),
  }),
});

export type CaseData = z.infer<typeof caseSchema>;
export type CaseCharacter = CaseData['characters'][number];
export type CaseEvidence = CaseData['evidence'][number];
export type CaseContradiction = CaseData['contradictions'][number];
export type MockLine = z.infer<typeof mockLine>;

export const labTestSchema = z.enum(LAB_TESTS);
