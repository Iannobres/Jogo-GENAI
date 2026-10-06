/**
 * Teste de consistência do diálogo contra o LLM real (Gemini ou Claude; gasta créditos de API).
 * Uso: GEMINI_API_KEY=... (ou ANTHROPIC_API_KEY=...) npm run test:llm
 *
 * Roda um roteiro de perguntas e confrontos com João Silva e checa que as falas
 * geradas seguem a ficha do caso: mente sobre o horário antes do confronto,
 * admite depois e nunca confessa o envenenamento.
 */
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const { loadCase } = await import('../src/case/loader');
const { createState, inspect, moveScene, sendToLab, waitForLab } = await import('../src/engine/gameState');
const { planConfront, planQuestion, planShowEvidence } = await import('../src/engine/interrogation');
const { getProvider, runTurn } = await import('../src/dialogue/service');

if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error('Defina GEMINI_API_KEY ou ANTHROPIC_API_KEY no .env para rodar este teste.');
  process.exit(1);
}

const c = loadCase();
const s = createState(c, '11111111-1111-1111-1111-111111111111');
const p = getProvider();
console.log(`Provedor: ${p.name} (${p.model})\n`);

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}`);
  if (!ok) failures++;
};

async function turn(plan: ReturnType<typeof planQuestion>) {
  const r = await runTurn(s, c, plan);
  const reply = r.lines.at(-1)!;
  console.log(`> ${plan.playerText}\n  [${r.provider}] (${reply.gesture ?? ''}) ${reply.text}  {${reply.emotion}}`);
  return { text: reply.text, provider: r.provider };
}

const confession = /(matei|envenenei|fui eu que)/i;

// Coleta as evidências necessárias
moveScene(s, c, 'monitoramento');
['h_cameras', 'h_acesso'].forEach((h) => inspect(s, c, h));
moveScene(s, c, 'corredor');
inspect(s, c, 'h_lixeira');
sendToLab(s, c, 'cartela', 'digitais');
waitForLab(s, c);

console.log('1) Perguntas antes do confronto');
for (const q of ['Onde você estava às 22h?', 'A que horas o senhor saiu do prédio?']) {
  const r = await turn(planQuestion(s, c, 'joao', q));
  check(r.provider === 'claude' || r.provider === 'gemini', 'resposta veio do LLM (não do fallback)');
  check(/21/.test(r.text) && !/22h?13/.test(r.text), 'sustenta a mentira das 21h');
  check(!confession.test(r.text), 'não confessa');
}

console.log('\n2) Pergunta fora do roteiro');
const off = await turn(planQuestion(s, c, 'joao', 'Qual é o seu time de futebol favorito?'));
check(!confession.test(off.text), 'não confessa');

console.log('\n3) Confronto com as câmeras');
const conf = await turn(planConfront(s, c, 'joao', 'c_joao_saida', 'log_cameras'));
check(/22/.test(conf.text), 'admite ter ficado até depois das 22h');
check(!confession.test(conf.text), 'não confessa');

console.log('\n4) Pressão máxima: cartela com digitais');
await turn(planQuestion(s, c, 'joao', 'Você mexeu no remédio do Carlos?'));
const broke = await turn(planShowEvidence(s, c, 'joao', 'cartela'));
check(!confession.test(broke.text), 'mesmo encurralado, não confessa');
check(s.suspects.joao.emotion === 'ABALADO', 'estado emocional ABALADO definido pelo engine');

console.log(`\n${failures ? `${failures} verificação(ões) falharam.` : 'Todas as verificações passaram.'}`);
process.exit(failures ? 1 : 0);
