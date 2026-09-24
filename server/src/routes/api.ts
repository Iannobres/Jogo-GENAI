import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { LAB_TESTS, type HealthResponse, type InspectResponse, type InterrogateResponse } from '@caso404/shared';
import { loadCase } from '../case/loader';
import { toPublicCase } from '../case/publicView';
import { GameError } from '../engine/errors';
import {
  createState,
  inspect,
  moveScene,
  sendToLab,
  toSessionView,
  updateBoard,
  waitForLab,
} from '../engine/gameState';
import { planConfront, planQuestion, planShowEvidence } from '../engine/interrogation';
import { getSession, newSessionId, saveSession } from '../engine/saves';
import { accuse } from '../engine/scoring';
import { getProvider, runTurn } from '../dialogue/service';

export const api = Router();

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);

/** Carrega a sessão, roda a ação e salva. Uma ação por vez por sessão. */
function session(req: Request) {
  const s = getSession(String(req.params.id));
  return { s, c: loadCase(s.caseId) };
}

api.get('/health', (_req, res) => {
  const p = getProvider();
  const body: HealthResponse = { ok: true, provider: p.name, ...(p.model ? { model: p.model } : {}) };
  res.json(body);
});

api.get('/case', (_req, res) => {
  res.json(toPublicCase(loadCase()));
});

api.post('/sessions', (_req, res) => {
  const c = loadCase();
  const s = createState(c, newSessionId());
  saveSession(s);
  res.status(201).json(toSessionView(s, c));
});

api.get('/sessions/:id', (req, res) => {
  const { s, c } = session(req);
  res.json(toSessionView(s, c));
});

api.post('/sessions/:id/scene', (req, res) => {
  const { sceneId } = z.object({ sceneId: z.string() }).parse(req.body);
  const { s, c } = session(req);
  const newFacts = moveScene(s, c, sceneId);
  saveSession(s);
  const body: InspectResponse = { session: toSessionView(s, c), message: '', newFacts };
  res.json(body);
});

api.post('/sessions/:id/inspect', (req, res) => {
  const { hotspotId } = z.object({ hotspotId: z.string() }).parse(req.body);
  const { s, c } = session(req);
  const { message, newFacts } = inspect(s, c, hotspotId);
  saveSession(s);
  const body: InspectResponse = { session: toSessionView(s, c), message, newFacts };
  res.json(body);
});

api.post('/sessions/:id/lab', (req, res) => {
  const { evidenceId, test } = z.object({ evidenceId: z.string(), test: z.enum(LAB_TESTS) }).parse(req.body);
  const { s, c } = session(req);
  const newFacts = sendToLab(s, c, evidenceId, test);
  saveSession(s);
  const body: InspectResponse = { session: toSessionView(s, c), message: 'Evidência enviada ao laboratório.', newFacts };
  res.json(body);
});

api.post('/sessions/:id/wait', (req, res) => {
  const { s, c } = session(req);
  const newFacts = waitForLab(s, c);
  saveSession(s);
  const body: InspectResponse = { session: toSessionView(s, c), message: 'Laudo recebido.', newFacts };
  res.json(body);
});

const interrogateBody = z.object({
  suspectId: z.string(),
  message: z.string().max(500).optional(),
  evidenceId: z.string().optional(),
  claimId: z.string().optional(),
});

// Evita duas chamadas simultâneas ao LLM na mesma sessão.
const busy = new Set<string>();

api.post(
  '/sessions/:id/interrogate',
  h(async (req, res) => {
    const body = interrogateBody.parse(req.body);
    const { s, c } = session(req);
    if (busy.has(s.id)) throw new GameError('Aguarde a resposta anterior.', 429);
    busy.add(s.id);
    try {
      const plan =
        body.claimId && body.evidenceId
          ? planConfront(s, c, body.suspectId, body.claimId, body.evidenceId)
          : body.evidenceId
            ? planShowEvidence(s, c, body.suspectId, body.evidenceId)
            : planQuestion(s, c, body.suspectId, body.message ?? '');
      const turn = await runTurn(s, c, plan);
      saveSession(s);
      const out: InterrogateResponse = { ...turn, session: toSessionView(s, c) };
      res.json(out);
    } finally {
      busy.delete(s.id);
    }
  }),
);

api.put('/sessions/:id/board', (req, res) => {
  const board = z
    .object({
      timeline: z.record(z.string(), z.string()),
      links: z.record(z.string(), z.array(z.string())),
      marks: z.record(z.string(), z.enum(['suspeito', 'descartado', 'neutro'])),
    })
    .parse(req.body);
  const { s, c } = session(req);
  updateBoard(s, c, board);
  saveSession(s);
  res.json(toSessionView(s, c));
});

api.post('/sessions/:id/accuse', (req, res) => {
  const acc = z
    .object({
      suspectId: z.string(),
      motiveId: z.string(),
      methodId: z.string(),
      evidenceIds: z.array(z.string()).max(3),
    })
    .parse(req.body);
  const { s, c } = session(req);
  accuse(s, c, acc);
  saveSession(s);
  res.json(toSessionView(s, c));
});

api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof GameError) return res.status(err.status).json({ error: err.message });
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'Requisição inválida.' });
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});
