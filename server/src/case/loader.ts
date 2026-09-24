import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caseSchema, type CaseData } from './schema';

const CASE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../case-data');

/** Confere se todo id referenciado no caso existe; lança erro listando os problemas. */
export function checkReferences(c: CaseData): void {
  const problems: string[] = [];
  const facts = new Set(c.facts.map((f) => f.id));
  const evidence = new Set(c.evidence.map((e) => e.id));
  const scenes = new Set(c.scenes.map((s) => s.id));
  const chars = new Set(c.characters.map((ch) => ch.id));
  const claims = new Set(c.claims.map((cl) => cl.id));
  const intents = new Set(c.intents.map((i) => i.id));
  const slots = new Set(c.timelineSlots.map((s) => s.id));

  const need = (set: Set<string>, id: string | undefined, where: string) => {
    if (id !== undefined && !set.has(id)) problems.push(`${where}: id inexistente "${id}"`);
  };

  need(scenes, c.startSceneId, 'startSceneId');
  for (const h of c.hotspots) {
    need(scenes, h.sceneId, `hotspot ${h.id}`);
    need(evidence, h.evidenceId, `hotspot ${h.id}`);
    h.facts?.forEach((f) => need(facts, f, `hotspot ${h.id}`));
    if (h.kind === 'evidence' && !h.evidenceId) problems.push(`hotspot ${h.id}: kind evidence sem evidenceId`);
  }
  for (const e of c.evidence) {
    need(scenes, e.sceneId, `evidence ${e.id}`);
    e.facts.forEach((f) => need(facts, f, `evidence ${e.id}`));
    Object.values(e.lab).forEach((l) => l?.facts?.forEach((f) => need(facts, f, `lab ${e.id}`)));
    if (!c.hotspots.some((h) => h.evidenceId === e.id)) problems.push(`evidence ${e.id}: nenhum hotspot aponta para ela`);
  }
  for (const f of c.facts) f.about.forEach((a) => need(chars, a, `fact ${f.id}`));
  for (const cl of c.claims) {
    need(chars, cl.suspectId, `claim ${cl.id}`);
    cl.intents.forEach((i) => need(intents, i, `claim ${cl.id}`));
  }
  for (const x of c.contradictions) {
    need(chars, x.suspectId, `contradiction ${x.id}`);
    need(claims, x.claimId, `contradiction ${x.id}`);
    need(evidence, x.evidenceId, `contradiction ${x.id}`);
    need(facts, x.requiresFact, `contradiction ${x.id}`);
    x.factsUnlocked.forEach((f) => need(facts, f, `contradiction ${x.id}`));
    x.claimsUnlocked?.forEach((cl) => need(claims, cl, `contradiction ${x.id}`));
  }
  for (const [suspectId, lines] of Object.entries(c.mockDialogue)) {
    need(chars, suspectId, 'mockDialogue');
    for (const [key, line] of Object.entries(lines)) {
      if (!['fallback', 'evidence', 'wrongConfront', 'limit'].includes(key)) need(intents, key, `mockDialogue ${suspectId}`);
      need(claims, line.claim, `mockDialogue ${suspectId}.${key}`);
      need(facts, line.fact, `mockDialogue ${suspectId}.${key}`);
      Object.keys(line.after ?? {}).forEach((f) => need(facts, f, `mockDialogue ${suspectId}.${key}.after`));
    }
  }
  for (const ev of c.timelineEvents) {
    need(slots, ev.slotId, `timelineEvent ${ev.id}`);
    ev.unlockedBy.forEach((f) => need(facts, f, `timelineEvent ${ev.id}`));
  }
  need(chars, c.solution.culpritId, 'solution');
  need(new Set(c.motives.map((m) => m.id)), c.solution.motiveId, 'solution');
  need(new Set(c.methods.map((m) => m.id)), c.solution.methodId, 'solution');
  c.solution.keyEvidence.forEach((e) => need(evidence, e, 'solution.keyEvidence'));
  for (const ch of c.characters) {
    if (ch.suspect && !c.mockDialogue[ch.id]) problems.push(`suspeito ${ch.id} sem mockDialogue`);
  }

  if (problems.length) throw new Error(`Caso "${c.id}" inválido:\n- ${problems.join('\n- ')}`);
}

export function parseCase(raw: unknown): CaseData {
  const data = caseSchema.parse(raw);
  checkReferences(data);
  return data;
}

const cache = new Map<string, CaseData>();

export function loadCase(caseId = 'case-001'): CaseData {
  const hit = cache.get(caseId);
  if (hit) return hit;
  const raw = JSON.parse(readFileSync(resolve(CASE_DIR, caseId, 'case.json'), 'utf-8'));
  const data = parseCase(raw);
  cache.set(caseId, data);
  return data;
}
