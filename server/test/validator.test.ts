import { describe, expect, it } from 'vitest';
import { loadCase } from '../src/case/loader';
import type { DialogueRequest } from '../src/dialogue/provider';
import { validateOutput } from '../src/dialogue/validator';

const c = loadCase();
const joao = c.characters.find((ch) => ch.id === 'joao')!;
const req: DialogueRequest = {
  character: joao,
  admitted: [],
  emotion: 'NERVOSO',
  directive: 'Tema da pergunta: paradeiro.',
  reference: { text: 'Saí por volta das 21h.' },
  history: [],
  playerText: 'Onde você estava às 22h?',
};

describe('validator da saída do LLM', () => {
  it('aceita uma fala coerente', () => {
    const v = validateOutput(c, req, { fala: 'Eu já tinha saído, lá pelas 21h. O Carlos estava bem.', gesto: 'ajeita a gravata', emocao: 'NERVOSO' }, 'NERVOSO', false);
    expect(v.ok).toBe(true);
  });

  it('rejeita confissão do homicídio', () => {
    const v = validateOutput(c, req, { fala: 'Tudo bem... fui eu que envenenei o Carlos.', emocao: 'ABALADO' }, 'NERVOSO', false);
    expect(v.ok).toBe(false);
    expect(v.problems.join()).toMatch(/confessar/);
  });

  it('rejeita nomes inventados', () => {
    const v = validateOutput(c, req, { fala: 'Eu estava com o Roberto no bar.', emocao: 'NERVOSO' }, 'NERVOSO', false);
    expect(v.ok).toBe(false);
    expect(v.problems.join()).toMatch(/Roberto/);
  });

  it('rejeita horários fora do roteiro', () => {
    const v = validateOutput(c, req, { fala: 'Saí às 19h45, fui ao cinema.', emocao: 'NERVOSO' }, 'NERVOSO', false);
    expect(v.ok).toBe(false);
    expect(v.problems.join()).toMatch(/19:45/);
  });

  it('corrige emoção inválida e respeita emoção forçada pelo engine', () => {
    expect(validateOutput(c, req, { fala: 'Não sei.', emocao: 'FELIZ' }, 'DEFENSIVO', false).output.emocao).toBe('DEFENSIVO');
    expect(validateOutput(c, req, { fala: 'Não sei.', emocao: 'CALMO' }, 'ABALADO', true).output.emocao).toBe('ABALADO');
  });
});
