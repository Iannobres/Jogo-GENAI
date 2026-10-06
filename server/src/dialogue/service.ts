import type { DialogueLine, Emotion, InterrogateResponse } from '@caso404/shared';
import type { CaseData } from '../case/schema';
import { knowsFact, type GameState } from '../engine/gameState';
import { normalize, type TurnPlan } from '../engine/interrogation';
import { ClaudeProvider } from './claudeProvider';
import { GeminiProvider } from './geminiProvider';
import { mockProvider } from './mockProvider';
import type { DialogueProvider, DialogueRequest } from './provider';
import { validateOutput } from './validator';

let provider: DialogueProvider | null = null;

/** Gemini quando há GEMINI_API_KEY; senão Claude com ANTHROPIC_API_KEY; senão Mock roteirizado. */
export function getProvider(): DialogueProvider {
  if (!provider) {
    provider = process.env.GEMINI_API_KEY
      ? new GeminiProvider(process.env.GEMINI_MODEL || 'gemini-2.5-flash', process.env.GEMINI_API_KEY)
      : process.env.ANTHROPIC_API_KEY
        ? new ClaudeProvider(process.env.CLAUDE_MODEL || 'claude-opus-5')
        : mockProvider;
  }
  return provider;
}

export function setProvider(p: DialogueProvider | null) {
  provider = p;
}

// Cache de respostas para perguntas repetidas (economiza chamadas de API).
type Reply = { fala: string; gesto?: string; emocao: Emotion };
const cache = new Map<string, Reply>();

function admittedFacts(s: GameState, c: CaseData, suspectId: string): string[] {
  return c.contradictions
    .filter((x) => x.suspectId === suspectId && s.triggered.includes(x.id))
    .flatMap((x) => x.factsUnlocked)
    .filter((f) => knowsFact(s, f))
    .map((f) => c.facts.find((ff) => ff.id === f)!.text);
}

/** Executa uma jogada já planejada pelo engine: gera, valida e registra a fala. */
export async function runTurn(s: GameState, c: CaseData, plan: TurnPlan): Promise<Omit<InterrogateResponse, 'session'>> {
  const sv = s.suspects[plan.suspectId];
  const character = c.characters.find((ch) => ch.id === plan.suspectId)!;
  const at = s.clock;
  const lines: DialogueLine[] = [
    { speaker: 'investigador', text: plan.playerText, at, kind: plan.kind },
  ];

  let used: InterrogateResponse['provider'] = 'engine';
  let reply: Reply = { fala: plan.reference.text, gesto: plan.reference.gesture, emocao: plan.emotion };

  if (!plan.canned) {
    const p = getProvider();
    used = p.name;
    const req: DialogueRequest = {
      character,
      admitted: admittedFacts(s, c, plan.suspectId),
      emotion: plan.emotion,
      directive: plan.directive,
      reference: plan.reference,
      history: sv.transcript,
      playerText: plan.playerText,
    };
    const key = [plan.suspectId, plan.kind, plan.emotion, plan.directive, normalize(plan.playerText)].join('|');
    const cached = p.name !== 'mock' && plan.kind === 'pergunta' ? cache.get(key) : undefined;
    if (cached) {
      reply = { ...cached, emocao: plan.emotion };
    } else if (p.name !== 'mock') {
      let feedback: string | undefined;
      let accepted = false;
      for (let attempt = 0; attempt < 2 && !accepted; attempt++) {
        try {
          const raw = await p.generate(req, feedback);
          const v = validateOutput(c, req, raw, plan.emotion, plan.outcome !== null);
          if (v.ok) {
            reply = v.output;
            accepted = true;
          } else {
            feedback = v.problems.join('; ');
            console.warn(`[validator] ${character.name}: ${feedback}`);
          }
        } catch (err) {
          console.error(`[${p.name}] ${(err as Error).message}`);
          break;
        }
      }
      if (accepted) {
        if (plan.kind === 'pergunta') cache.set(key, reply);
      } else {
        used = 'mock'; // fallback: fala roteirizada
      }
    }
  }

  if (plan.systemNote) lines.push({ speaker: 'sistema', text: plan.systemNote, at, ...(plan.outcome ? { kind: plan.outcome } : {}) });
  const emotion = plan.outcome ? plan.emotion : reply.emocao;
  sv.emotion = emotion;
  lines.push({ speaker: 'suspeito', text: reply.fala, gesture: reply.gesto, emotion, at, kind: 'resposta' });
  sv.transcript.push(...lines);

  return { lines, newFacts: plan.newFacts, provider: used };
}
