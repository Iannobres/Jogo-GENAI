import { useState } from 'react';
import { useGame } from '../store/game';

const COVER = '/assets/menu/capa.webp';

export function Menu() {
  const { caseData, health, savedSessionId, newGame, continueGame, go, busy } = useGame();
  const [left, setLeft] = useState(false);

  return (
    <div className="relative flex min-h-full flex-col items-center overflow-x-hidden bg-[#07080b]">
      {/* Capa: o título "CASO 404" já faz parte da arte. No celular ela fica inteira no topo; em telas maiores cobre o fundo. */}
      <img
        src={COVER}
        alt=""
        draggable={false}
        className="aspect-video w-full object-cover sm:absolute sm:inset-0 sm:aspect-auto sm:h-full"
      />
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-transparent via-transparent via-45% to-[#07080b]/95 sm:block" />
      <h1 className="sr-only">CASO 404</h1>

      <p className="absolute left-4 top-4 hidden text-[10px] uppercase tracking-[0.3em] text-slate-400/80 sm:block">Build do CP4</p>

      <main className="relative z-10 flex w-full max-w-xs flex-col items-center px-4 pb-12 pt-6 text-center sm:pt-[max(50dvh,19rem)]">
        <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-slate-300 [text-shadow:0_1px_8px_#000] sm:whitespace-nowrap">
          {caseData?.tagline ?? 'Uma investigação criminal conduzida por IA'}
        </p>

        {left ? (
          <div className="panel w-full p-6">
            <p className="text-lg font-semibold">Investigação suspensa.</p>
            <p className="mt-2 text-sm text-slate-400">O progresso fica salvo no servidor. Você pode fechar esta aba.</p>
            <button className="btn mt-4" onClick={() => setLeft(false)}>
              Voltar ao menu
            </button>
          </div>
        ) : (
          <nav className="flex w-full flex-col gap-1.5">
            <button className="btn btn-primary py-2.5 tracking-[0.2em]" onClick={newGame} disabled={busy || !caseData}>
              Novo Caso
            </button>
            <button className="btn bg-black/60 py-2.5 tracking-[0.2em] backdrop-blur-sm" onClick={continueGame} disabled={busy || !savedSessionId}>
              Continuar Investigação
            </button>
            <button className="btn bg-black/60 py-2.5 tracking-[0.2em] backdrop-blur-sm" onClick={() => go('tutorial')}>
              Como Jogar
            </button>
            <button className="btn bg-black/60 py-2.5 tracking-[0.2em] backdrop-blur-sm" onClick={() => go('settings')}>
              Configurações
            </button>
            <button className="btn bg-black/60 py-2.5 tracking-[0.2em] backdrop-blur-sm" onClick={() => go('credits')}>
              Créditos
            </button>
            <button className="btn bg-black/60 py-2.5 tracking-[0.2em] backdrop-blur-sm" onClick={() => setLeft(true)}>
              Sair
            </button>
          </nav>
        )}
      </main>

      <footer className="absolute bottom-3 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 text-[10px] text-slate-500">
        <span>
          Diálogos:{' '}
          {health
            ? health.provider === 'mock'
              ? 'modo roteirizado (sem chave de API)'
              : `${health.provider === 'gemini' ? 'Gemini' : 'Claude'} (${health.model})`
            : '...'}
        </span>
        <span>Arte de capa gerada por IA</span>
      </footer>
    </div>
  );
}
