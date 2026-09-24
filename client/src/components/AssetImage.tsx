import { useState, type ReactNode } from 'react';

type Kind = 'portrait' | 'scene' | 'evidence';

interface Props {
  src: string;
  alt: string;
  kind: Kind;
  className?: string;
  /** Texto do placeholder quando a imagem gerada por IA ainda não existe. */
  label?: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function PlaceholderArt({ kind, label }: { kind: Kind; label: string }): ReactNode {
  if (kind === 'portrait') {
    return (
      <div className="relative flex h-full w-full items-end justify-center overflow-hidden bg-gradient-to-b from-slate-700 via-slate-900 to-ink">
        <svg viewBox="0 0 100 100" className="absolute inset-x-0 bottom-0 h-[85%] w-full text-slate-950/80" aria-hidden>
          <circle cx="50" cy="38" r="20" fill="currentColor" />
          <path d="M10 100 C10 70 30 60 50 60 C70 60 90 70 90 100 Z" fill="currentColor" />
        </svg>
        <span className="absolute top-1/3 -translate-y-1/2 text-3xl font-black tracking-widest text-slate-500/70">{initials(label)}</span>
      </div>
    );
  }
  if (kind === 'scene') {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#1e3a6b_0%,#0b1528_45%,#05080f_100%)]">
        <div className="absolute left-1/2 top-[12%] h-[45%] w-[34%] -translate-x-1/2 rounded-sm border border-slate-600/30 bg-[repeating-linear-gradient(180deg,#1b2d4d_0_6px,#0e1a30_6px_12px)] opacity-70" />
        <div className="absolute inset-x-[15%] bottom-[18%] h-[22%] skew-x-[-8deg] rounded-md border border-sky-200/10 bg-sky-200/5" />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-3 left-1/2 w-max max-w-[90%] -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {label}: imagem pendente (gerar no Bing)
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
      <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

/** Imagem gerada por IA com fallback automático para placeholder. */
export function AssetImage({ src, alt, kind, className, label }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    // O className (posição/tamanho) fica no wrapper; o desenho preenche por dentro.
    return (
      <div className={`overflow-hidden ${className ?? ''}`}>
        <PlaceholderArt kind={kind} label={label ?? alt} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className ?? ''}`} onError={() => setFailed(true)} draggable={false} />;
}
