import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameError } from './errors';
import type { GameState } from './gameState';

const SAVE_DIR = process.env.SAVE_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../data/saves');
const ID_RE = /^[a-f0-9-]{36}$/;

const sessions = new Map<string, GameState>();

export function newSessionId(): string {
  return randomUUID();
}

export function saveSession(s: GameState): void {
  sessions.set(s.id, s);
  mkdirSync(SAVE_DIR, { recursive: true });
  writeFileSync(resolve(SAVE_DIR, `${s.id}.json`), JSON.stringify(s, null, 2), 'utf-8');
}

export function getSession(id: string): GameState {
  if (!ID_RE.test(id)) throw new GameError('Sessão inválida.', 404);
  const hit = sessions.get(id);
  if (hit) return hit;
  const file = resolve(SAVE_DIR, `${id}.json`);
  if (!existsSync(file)) throw new GameError('Sessão não encontrada.', 404);
  const s = JSON.parse(readFileSync(file, 'utf-8')) as GameState;
  sessions.set(id, s);
  return s;
}
