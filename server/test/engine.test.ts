import { beforeEach, describe, expect, it } from 'vitest';
import { loadCase } from '../src/case/loader';
import { toPublicCase } from '../src/case/publicView';
import { createState, inspect, moveScene, sendToLab, toSessionView, updateBoard, waitForLab, type GameState } from '../src/engine/gameState';
import { detectIntent, planConfront, planQuestion, planShowEvidence } from '../src/engine/interrogation';
import { accuse } from '../src/engine/scoring';
import { mockProvider } from '../src/dialogue/mockProvider';
import { runTurn, setProvider } from '../src/dialogue/service';

const c = loadCase();
let s: GameState;

beforeEach(() => {
  setProvider(mockProvider);
  s = createState(c, '00000000-0000-0000-0000-000000000000');
});

const collect = (sceneId: string, hotspotIds: string[]) => {
  moveScene(s, c, sceneId);
  hotspotIds.forEach((h) => inspect(s, c, h));
};

describe('caso', () => {
  it('carrega e passa na checagem de referências', () => {
    expect(c.characters.filter((ch) => ch.suspect)).toHaveLength(5);
    expect(c.evidence).toHaveLength(10);
  });

  it('a versão pública não vaza segredos', () => {
    const json = JSON.stringify(toPublicCase(c));
    for (const secret of ['solution', 'knowledge', 'lies', 'isCulprit', 'contradictions', 'mockDialogue', 'directive', 'culpritId']) {
      expect(json).not.toContain(secret);
    }
    // Nenhum texto de conhecimento ou resultado de laboratório aparece
    expect(json).not.toContain('triturou');
    expect(json).not.toContain('Digitais de João Silva');
  });

  it('a sessão inicial não vaza fatos nem declarações', () => {
    const view = toSessionView(s, c);
    expect(view.facts).toEqual([]);
    expect(view.heardClaims).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('culprit');
  });
});

describe('exploração, relógio e laboratório', () => {
  it('coleta evidência, libera fatos e cobra tempo só na primeira vez', () => {
    const t0 = s.clock;
    const r = inspect(s, c, 'h_copo');
    expect(s.evidence.copo.status).toBe('descoberta');
    expect(r.newFacts.map((f) => f.id)).toContain('f_copo');
    expect(s.clock).toBe(t0 + c.costs.inspect);
    inspect(s, c, 'h_copo');
    expect(s.clock).toBe(t0 + c.costs.inspect);
  });

  it('não permite inspecionar ponto de outra cena', () => {
    expect(() => inspect(s, c, 'h_lixeira')).toThrow();
  });

  it('laboratório: em análise, depois analisada com fatos novos', () => {
    inspect(s, c, 'h_caixa');
    sendToLab(s, c, 'caixa_remedio', 'digitais');
    expect(s.evidence.caixa_remedio.status).toBe('em_analise');
    const facts = waitForLab(s, c);
    expect(s.evidence.caixa_remedio.status).toBe('analisada');
    expect(facts.map((f) => f.id)).toContain('f_lab_caixa_digitais');
    expect(() => sendToLab(s, c, 'caixa_remedio', 'digitais')).toThrow();
  });

  it('a cartela na lixeira se perde se o jogador demorar', () => {
    s.clock = 1529;
    moveScene(s, c, 'corredor');
    expect(s.evidence.cartela.status).toBe('perdida');
    const r = inspect(s, c, 'h_lixeira');
    expect(r.message).toMatch(/limpeza/);
  });
});

describe('interrogatório', () => {
  it('detecta intenções por palavra-chave', () => {
    expect(detectIntent(c, 'Onde você estava às 22h?')).toBe('paradeiro');
    expect(detectIntent(c, 'O senhor tinha alguma dívida com ele?')).toBe('dinheiro');
    expect(detectIntent(c, 'Quem mexeu no remédio?')).toBe('remedio');
    expect(detectIntent(c, 'Viu o log do sistema?')).toBe('cameras');
    expect(detectIntent(c, 'xyz')).toBeNull();
  });

  it('pergunta de paradeiro gera a declaração mentirosa do João', async () => {
    const turn = await runTurn(s, c, planQuestion(s, c, 'joao', 'Onde você estava às 22h?'));
    expect(s.heardClaims).toContain('c_joao_saida');
    expect(turn.lines.at(-1)!.text).toMatch(/21h/);
  });

  it('nome fora do caso recebe resposta controlada pelo backend', async () => {
    const plan = planQuestion(s, c, 'joao', 'Você conhece o Pedro Albuquerque?');
    expect(plan.canned).toBe(true);
    const turn = await runTurn(s, c, plan);
    expect(turn.provider).toBe('engine');
  });

  it('confronto só vale com a declaração ouvida e a evidência certa', async () => {
    collect('monitoramento', ['h_cameras', 'h_acesso']);
    expect(() => planConfront(s, c, 'joao', 'c_joao_saida', 'log_cameras')).toThrow(/declaração/);
    await runTurn(s, c, planQuestion(s, c, 'joao', 'A que horas você saiu?'));

    const wrong = planConfront(s, c, 'joao', 'c_joao_saida', 'log_cartoes');
    expect(wrong.outcome).toBeNull();

    const right = planConfront(s, c, 'joao', 'c_joao_saida', 'log_cameras');
    expect(right.outcome).toBe('contradicao');
    expect(s.suspects.joao.emotion).toBe('DEFENSIVO');
    expect(s.heardClaims).toContain('c_joao_direto');
    expect(s.facts.map((f) => f.id)).toContain('f_joao_admite_22h13');

    const again = planConfront(s, c, 'joao', 'c_joao_saida', 'log_cameras');
    expect(again.canned).toBe(true);
  });

  it('contradição que depende de laudo exige o laboratório primeiro', async () => {
    moveScene(s, c, 'corredor');
    inspect(s, c, 'h_lixeira');
    await runTurn(s, c, planQuestion(s, c, 'joao', 'Você mexeu no remédio dele?'));
    expect(planShowEvidence(s, c, 'joao', 'cartela').outcome).toBeNull();
    sendToLab(s, c, 'cartela', 'digitais');
    waitForLab(s, c);
    const plan = planShowEvidence(s, c, 'joao', 'cartela');
    expect(plan.outcome).toBe('contradicao');
    expect(plan.emotion).toBe('ABALADO');
  });

  it('respeita o limite de perguntas', () => {
    for (let i = 0; i < c.questionLimit; i++) planQuestion(s, c, 'ricardo', 'Boa noite');
    const plan = planQuestion(s, c, 'ricardo', 'Mais uma?');
    expect(plan.canned).toBe(true);
    expect(s.suspects.ricardo.questionsUsed).toBe(c.questionLimit);
  });
});

describe('quadro e acusação', () => {
  it('só aceita eventos liberados na linha do tempo', () => {
    updateBoard(s, c, { timeline: { s2300: 'e_morte' }, links: {}, marks: {} });
    expect(s.board.timeline).toEqual({});
    inspect(s, c, 'h_corpo');
    updateBoard(s, c, { timeline: { s2300: 'e_morte' }, links: {}, marks: { joao: 'suspeito' } });
    expect(s.board.timeline).toEqual({ s2300: 'e_morte' });
  });

  it('acusação errada dá pontuação parcial e encerra o caso', () => {
    collect('sala404', ['h_copo', 'h_caixa', 'h_corpo']);
    const r = accuse(s, c, { suspectId: 'mariana', motiveId: 'demissao', methodId: 'digoxina_bebida', evidenceIds: ['copo'] });
    expect(r.correct).toBe(false);
    expect(r.total).toBeGreaterThan(0);
    expect(r.total).toBeLessThan(40);
    expect(s.finished).toBe(true);
    expect(() => inspect(s, c, 'h_agenda')).toThrow();
  });

  it('partida completa bem jogada chega à nota máxima', async () => {
    // Explora tudo
    collect('corredor', ['h_lixeira', 'h_copa', 'h_mesa_mariana', 'h_elevador']);
    collect('sala404', ['h_copo', 'h_caixa', 'h_celular', 'h_contrato', 'h_agenda', 'h_porta', 'h_corpo', 'h_janela']);
    collect('monitoramento', ['h_cameras', 'h_acesso', 'h_servidor', 'h_livro']);
    // Todos os exames produtivos
    for (const [ev, test] of [
      ['copo', 'digitais'], ['copo', 'substancias'], ['caixa_remedio', 'digitais'],
      ['fechadura', 'digitais'], ['cartela', 'digitais'], ['cartela', 'substancias'],
    ] as const) sendToLab(s, c, ev, test);
    while (s.lab.some((l) => !l.done)) waitForLab(s, c);

    // Ouve todas as declarações e dispara todas as contradições/confirmações
    const ask: Record<string, string[]> = {
      joao: ['Onde você estava?', 'Tinha alguma dívida?', 'Mandou alguma mensagem de ameaça?', 'Mexeu no remédio?'],
      helena: ['Onde a senhora estava?', 'Como era o casamento?'],
      mariana: ['A que horas saiu?', 'Você serviu bebida?'],
      ricardo: ['A porta estava trancada?', 'O sistema de câmeras deu alerta?'],
      felipe: ['Você tem acesso ao sistema?', 'Onde você estava?'],
    };
    for (const [id, qs] of Object.entries(ask)) for (const q of qs) await runTurn(s, c, planQuestion(s, c, id, q));
    for (const x of c.contradictions) {
      await runTurn(s, c, planConfront(s, c, x.suspectId, x.claimId, x.evidenceId));
    }
    expect(s.triggered).toHaveLength(c.contradictions.length);

    // Linha do tempo perfeita
    const timeline = Object.fromEntries(c.timelineEvents.map((e) => [e.slotId, e.id]));
    updateBoard(s, c, { timeline, links: {}, marks: {} });
    expect(Object.keys(s.board.timeline)).toHaveLength(c.timelineEvents.length);

    const r = accuse(s, c, {
      suspectId: 'joao', motiveId: 'divida', methodId: 'digoxina_bebida',
      evidenceIds: ['cartela', 'caixa_remedio', 'log_cartoes'],
    });
    expect(r.correct).toBe(true);
    expect(r.total).toBe(100);
    expect(r.grade).toBe('S');
  });
});
