import type { PublicCase } from '@caso404/shared';
import type { CaseData } from './schema';

/**
 * Converte o caso completo na versão que pode ir para o navegador.
 * Lista branca: só copia campos explicitamente públicos. Solução, conhecimento
 * e mentiras dos suspeitos, contradições, resultados de laboratório e falas
 * roteirizadas nunca saem daqui.
 */
export function toPublicCase(c: CaseData): PublicCase {
  return {
    id: c.id,
    title: c.title,
    tagline: c.tagline,
    briefing: c.briefing,
    startClock: c.startClock,
    startSceneId: c.startSceneId,
    questionLimit: c.questionLimit,
    characters: c.characters.map((ch) => ({
      id: ch.id,
      name: ch.name,
      role: ch.role,
      age: ch.age,
      summary: ch.summary,
      portrait: ch.portrait,
      ...(ch.isVictim ? { isVictim: true } : {}),
    })),
    scenes: c.scenes.map((s) => ({ id: s.id, name: s.name, description: s.description, image: s.image })),
    hotspots: c.hotspots.map((h) => ({
      id: h.id,
      sceneId: h.sceneId,
      x: h.x,
      y: h.y,
      label: h.label,
      kind: h.kind,
      ...(h.evidenceId ? { evidenceId: h.evidenceId } : {}),
    })),
    evidence: c.evidence.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      image: e.image,
      sceneId: e.sceneId,
    })),
    motives: c.motives,
    methods: c.methods,
    timelineSlots: c.timelineSlots,
  };
}
