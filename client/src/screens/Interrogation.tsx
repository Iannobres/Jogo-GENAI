import type { DialogueLine } from '@caso404/shared';
import { useEffect, useRef, useState } from 'react';
import { AssetImage } from '../components/AssetImage';
import { EmotionBadge, Typewriter } from '../components/ui';
import { useGame } from '../store/game';

const SUGGESTIONS = [
  'Onde você estava entre 21h e 23h?',
  'Qual era sua relação com Carlos?',
  'Você tinha problemas de dinheiro com ele?',
  'O que sabe sobre a bebida dele?',
  'Sabia do remédio para o coração?',
  'O que você acha dos outros suspeitos?',
  'O sistema de câmeras registrou algo?',
  'E a porta trancada?',
];

type Mode = 'ask' | 'show' | 'confront';

function Line({ line, name, animate, typewriter }: { line: DialogueLine; name: string; animate: boolean; typewriter: boolean }) {
  if (line.speaker === 'sistema') {
    const strong = line.kind === 'contradicao' || line.kind === 'confirmacao';
    return (
      <p className={`fade-up mx-auto my-1 w-fit rounded-full px-3 py-1 text-center text-xs font-bold ${strong ? 'bg-clue text-black' : 'bg-slate-800 text-slate-300'}`}>
        {line.kind === 'contradicao' ? '⚡ ' : line.kind === 'confirmacao' ? '✔ ' : 'ℹ '}
        {line.text}
      </p>
    );
  }
  const isPlayer = line.speaker === 'investigador';
  return (
    <div className={`fade-up rounded-md border-l-4 bg-black/30 px-3 py-2 ${isPlayer ? 'border-accent' : 'border-amber-500'}`}>
      <p className={`label mb-1 ${isPlayer ? '!text-accent' : '!text-amber-400'}`}>{isPlayer ? 'Investigador' : name}</p>
      {!isPlayer && line.gesture && <p className="mb-1 text-xs italic text-slate-400">({line.gesture})</p>}
      <p className="text-[15px] leading-relaxed">{isPlayer ? line.text : <>“<Typewriter text={line.text} enabled={animate && typewriter} />”</>}</p>
    </div>
  );
}

export function Interrogation() {
  const { session, caseData, suspectId, interrogate, busy, go, settings } = useGame();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('ask');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const transcript = (suspectId && session?.suspects[suspectId]?.transcript) || [];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [transcript.length, waiting]);

  if (!session || !caseData || !suspectId) return null;
  const ch = caseData.characters.find((c) => c.id === suspectId)!;
  const sv = session.suspects[suspectId];
  const left = caseData.questionLimit - sv.questionsUsed;
  const claims = session.heardClaims.filter((c) => c.suspectId === suspectId);
  const evidence = caseData.evidence.filter((e) => {
    const st = session.evidence[e.id]?.status;
    return st && st !== 'nao_descoberta' && st !== 'perdida';
  });

  async function send(body: Parameters<typeof interrogate>[0]) {
    const before = transcript.length;
    setWaiting(true);
    const lines = await interrogate(body);
    setWaiting(false);
    if (lines) {
      setFresh(before + lines.length - 1);
      setMode('ask');
      setClaimId(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-3 sm:p-6 lg:flex-row">
      {/* Retrato */}
      <aside className="flex shrink-0 flex-row gap-3 lg:w-80 lg:flex-col">
        <div className="panel relative w-32 shrink-0 overflow-hidden sm:w-44 lg:w-full">
          <AssetImage src={ch.portrait} alt={ch.name} kind="portrait" className="aspect-[3/4] w-full" />
          <div className="absolute right-2 top-2 hidden sm:block">
            <EmotionBadge emotion={sv.emotion} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
            <p className="font-bold">{ch.name}</p>
            <p className="text-[11px] text-slate-300">{ch.role}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          <div className="sm:hidden">
            <EmotionBadge emotion={sv.emotion} />
          </div>
          <div className="panel p-3">
            <p className="label">Perguntas restantes</p>
            <p className="text-2xl font-black">{left}</p>
          </div>
          <div className="panel hidden p-3 sm:block">
            <p className="label mb-1">Declarações registradas</p>
            {claims.length === 0 ? (
              <p className="text-xs text-slate-400">Faça perguntas para o suspeito se comprometer com uma versão.</p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-300">
                {claims.map((c) => (
                  <li key={c.id}>“{c.text}”</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Conversa */}
      <section className="flex min-h-[60dvh] min-w-0 flex-1 flex-col gap-3">
        <div ref={scroller} className="panel flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '60dvh' }}>
          {transcript.length === 0 && (
            <p className="text-sm text-slate-400">
              {ch.name} aguarda na sala de interrogatório. Pergunte livremente: as respostas são geradas por IA a partir da ficha do personagem.
            </p>
          )}
          {transcript.map((l, i) => (
            <Line key={i} line={l} name={ch.name} animate={i === fresh} typewriter={settings.typewriter} />
          ))}
          {waiting && (
            <p className="typing text-sm text-slate-400">
              {ch.name.split(' ')[0]} está pensando <span>.</span>
              <span>.</span>
              <span>.</span>
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button className={`btn ${mode === 'ask' ? 'btn-primary' : ''}`} onClick={() => setMode('ask')}>
            Fazer pergunta
          </button>
          <button className={`btn ${mode === 'show' ? 'btn-primary' : ''}`} onClick={() => setMode('show')} disabled={!evidence.length}>
            Mostrar evidência
          </button>
          <button className={`btn ${mode === 'confront' ? 'btn-danger' : ''}`} onClick={() => setMode('confront')} disabled={!claims.length || !evidence.length}>
            Confrontar contradição
          </button>
          <button className="btn" onClick={() => go('suspects')}>
            Encerrar interrogatório
          </button>
        </div>

        {mode === 'ask' && (
          <div className="space-y-2">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                const q = text;
                setText('');
                send({ message: q });
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder={left > 0 ? `Pergunte algo a ${ch.name.split(' ')[0]}...` : 'Limite de perguntas atingido'}
                className="min-w-0 flex-1 rounded-md border border-edge bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent"
                disabled={busy}
                autoFocus
              />
              <button className="btn btn-primary" disabled={busy || !text.trim()}>
                Perguntar
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="rounded-full border border-edge px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent" onClick={() => setText(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'show' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="label">Mostrar:</span>
            {evidence.map((e) => (
              <button key={e.id} className="btn px-3 py-1.5 text-xs" disabled={busy} onClick={() => send({ evidenceId: e.id })}>
                {e.name}
              </button>
            ))}
          </div>
        )}

        {mode === 'confront' && (
          <div className="panel space-y-3 p-3">
            <div>
              <p className="label mb-1">1. Escolha a declaração</p>
              <div className="flex flex-col gap-1.5">
                {claims.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClaimId(c.id)}
                    className={`rounded-md border px-3 py-1.5 text-left text-sm ${claimId === c.id ? 'border-red-500 bg-red-950/50' : 'border-edge hover:border-slate-500'}`}
                  >
                    “{c.text}”
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label">2. Confrontar com:</span>
              {evidence.map((e) => (
                <button key={e.id} className="btn px-3 py-1.5 text-xs" disabled={busy || !claimId} onClick={() => send({ claimId: claimId!, evidenceId: e.id })}>
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
