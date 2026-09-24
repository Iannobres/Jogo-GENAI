import type { Emotion, EvidenceStatus } from '@caso404/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../store/game';

export const EMOTION_STYLE: Record<Emotion, string> = {
  CALMO: 'bg-emerald-600 text-white',
  NERVOSO: 'bg-amber-600 text-black',
  DEFENSIVO: 'bg-sky-700 text-white',
  IRRITADO: 'bg-red-700 text-white',
  ABALADO: 'bg-purple-700 text-white',
};

export function EmotionBadge({ emotion }: { emotion: Emotion }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest shadow ${EMOTION_STYLE[emotion]}`}>
      Estado: {emotion}
    </span>
  );
}

const STATUS_LABEL: Record<EvidenceStatus, { text: string; cls: string }> = {
  nao_descoberta: { text: 'Não descoberta', cls: 'bg-slate-700 text-slate-300' },
  descoberta: { text: 'Descoberta', cls: 'bg-sky-800 text-sky-100' },
  em_analise: { text: 'Em análise', cls: 'bg-amber-700 text-amber-50' },
  analisada: { text: 'Analisada', cls: 'bg-emerald-700 text-emerald-50' },
  perdida: { text: 'Perdida', cls: 'bg-red-900 text-red-100' },
};

export function StatusBadge({ status }: { status: EvidenceStatus }) {
  const s = STATUS_LABEL[status];
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>{s.text}</span>;
}

/** Cabeçalho padrão das telas secundárias, com botão de voltar. */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const go = useGame((s) => s.go);
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-edge px-4 py-3 sm:px-6">
      <button className="btn" onClick={() => go('scene')}>
        ← Cena
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-wide">{title}</h1>
        {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`fade-up pointer-events-auto rounded-lg border px-3 py-2 text-left text-sm shadow-xl backdrop-blur ${
            t.kind === 'fact'
              ? 'border-clue/60 bg-amber-950/90 text-amber-50'
              : t.kind === 'error'
                ? 'border-red-600/60 bg-red-950/90 text-red-50'
                : 'border-edge bg-panel/95 text-slate-100'
          }`}
        >
          {t.kind === 'fact' && <span className="label mb-0.5 block !text-clue">Nova pista</span>}
          {t.text}
        </button>
      ))}
    </div>
  );
}

/** Máquina de escrever simples para falas geradas. */
export function Typewriter({ text, enabled }: { text: string; enabled: boolean }) {
  return enabled ? <TypewriterInner key={text} text={text} /> : <>{text}</>;
}


function TypewriterInner({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => Math.min(text.length, v + 2)), 18);
    return () => clearTimeout(t);
  }, [n, text]);
  return (
    <span onClick={() => setN(text.length)}>
      {text.slice(0, n)}
      {n < text.length && <span className="opacity-40">▍</span>}
    </span>
  );
}
