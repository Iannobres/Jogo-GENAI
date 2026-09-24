import { useState } from 'react';
import { AssetImage } from '../components/AssetImage';
import { useGame } from '../store/game';

export function Menu() {
  const { caseData, health, savedSessionId, newGame, continueGame, go, busy } = useGame();
  const [left, setLeft] = useState(false);
  const bg = caseData?.scenes.find((s) => s.id === caseData.startSceneId);

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden">
      {bg && <AssetImage src={bg.image} alt="" kind="scene" label={bg.name} className="absolute inset-0 h-full w-full scale-105 blur-[1px]" />}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/70 to-ink/95" />

      <p className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.3em] text-slate-400">CASO 404: build do CP4</p>

      <main className="relative z-10 flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
        <h1 className="text-6xl font-black tracking-[0.15em] text-slate-100 drop-shadow-lg sm:text-7xl">
          CASO <span className="text-accent">404</span>
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-300">{caseData?.tagline ?? 'Uma investigação criminal conduzida por IA'}</p>

        {left ? (
          <div className="panel mt-12 w-full p-6">
            <p className="text-lg font-semibold">Investigação suspensa.</p>
            <p className="mt-2 text-sm text-slate-400">O progresso fica salvo no servidor. Você pode fechar esta aba.</p>
            <button className="btn mt-4" onClick={() => setLeft(false)}>
              Voltar ao menu
            </button>
          </div>
        ) : (
          <nav className="mt-12 flex w-full max-w-xs flex-col gap-3">
            <button className="btn btn-primary py-3 uppercase tracking-[0.2em]" onClick={newGame} disabled={busy || !caseData}>
              Novo Caso
            </button>
            <button className="btn py-3 uppercase tracking-[0.2em]" onClick={continueGame} disabled={busy || !savedSessionId}>
              Continuar Investigação
            </button>
            <button className="btn py-3 uppercase tracking-[0.2em]" onClick={() => go('settings')}>
              Configurações
            </button>
            <button className="btn py-3 uppercase tracking-[0.2em]" onClick={() => go('credits')}>
              Créditos
            </button>
            <button className="btn py-3 uppercase tracking-[0.2em]" onClick={() => setLeft(true)}>
              Sair
            </button>
          </nav>
        )}
      </main>

      <footer className="absolute bottom-3 left-0 right-0 flex flex-wrap items-center justify-between gap-2 px-4 text-[10px] text-slate-500">
        <span>
          Diálogos:{' '}
          {health ? (health.provider === 'claude' ? `Claude (${health.model})` : 'modo roteirizado (sem chave de API)') : '...'}
        </span>
        <span>Imagem de fundo gerada por IA: Bing Image Creator (DALL·E 3)</span>
      </footer>
    </div>
  );
}
