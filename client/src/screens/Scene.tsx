import { formatClock, LAB_TEST_LABEL, type PublicHotspot } from '@caso404/shared';
import { useMemo, useState, type MouseEvent } from 'react';
import { AssetImage } from '../components/AssetImage';
import { StatusBadge } from '../components/ui';
import { useCaseLookup, useGame } from '../store/game';

const DEBUG = new URLSearchParams(location.search).has('debug');

function Hotspot({ h, index, done, showLabel, onClick }: { h: PublicHotspot; index: number; done: boolean; showLabel: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
      style={{ left: `${h.x}%`, top: `${h.y}%` }}
      aria-label={h.label}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-black sm:h-8 sm:w-8 ${
          done ? 'border-slate-400/70 bg-slate-900/70 text-slate-300' : 'hotspot-pulse border-clue bg-black/60 text-clue'
        } transition group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-accent`}
      >
        {done ? '✓' : index}
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-0.5 text-[11px] font-semibold text-slate-100 ${
          showLabel ? '' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
        }`}
      >
        {h.label}
      </span>
    </button>
  );
}

function InventoryDrawer() {
  const { session, caseData, setInventory, go } = useGame();
  const { evidence: findEv } = useCaseLookup();
  const [selected, setSelected] = useState<string | null>(null);
  if (!session || !caseData) return null;
  const items = caseData.evidence.filter((e) => {
    const st = session.evidence[e.id]?.status;
    return st && st !== 'nao_descoberta';
  });
  const sel = selected ? findEv(selected) : null;
  const selStatus = sel ? session.evidence[sel.id].status : null;
  const labs = sel ? session.lab.filter((l) => l.evidenceId === sel.id) : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setInventory(false)}>
      <aside className="panel fade-up flex h-full w-full max-w-md flex-col rounded-none border-y-0 border-r-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-edge p-4">
          <h2 className="text-lg font-bold">🎒 Inventário de evidências</h2>
          <button className="btn px-3 py-1" onClick={() => setInventory(false)}>
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 && <p className="text-sm text-slate-400">Nenhuma evidência coletada ainda. Clique nos pontos amarelos da cena.</p>}
          <div className="grid grid-cols-2 gap-3">
            {items.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id === selected ? null : e.id)}
                className={`overflow-hidden rounded-lg border text-left transition ${selected === e.id ? 'border-accent' : 'border-edge hover:border-slate-500'}`}
              >
                <AssetImage src={e.image} alt={e.name} kind="evidence" label={e.name} className="aspect-[4/3] w-full" />
                <div className="space-y-1 p-2">
                  <p className="text-xs font-semibold leading-tight">{e.name}</p>
                  <StatusBadge status={session.evidence[e.id].status} />
                </div>
              </button>
            ))}
          </div>
          {sel && selStatus && (
            <div className="mt-4 rounded-lg border border-edge bg-black/30 p-4 text-sm">
              <p className="font-bold">{sel.name}</p>
              <p className="mt-1 text-slate-300">{sel.description}</p>
              {labs.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {labs.map((l) => (
                    <li key={l.test} className="rounded bg-slate-900/70 p-2">
                      <span className="label">{LAB_TEST_LABEL[l.test]}</span>
                      <p className="mt-0.5">{l.result ?? `Em análise, pronto às ${formatClock(l.readyAt)}`}</p>
                    </li>
                  ))}
                </ul>
              )}
              {selStatus !== 'perdida' && (
                <button className="btn mt-3" onClick={() => go('lab')}>
                  🔬 Ir ao laboratório
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function MapOverlay() {
  const { session, caseData, setMap, moveScene, busy } = useGame();
  if (!session || !caseData) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={() => setMap(false)}>
      <div className="panel fade-up w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">🗺️ Mapa do prédio</h2>
          <button className="btn px-3 py-1" onClick={() => setMap(false)}>
            ✕
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {caseData.scenes.map((sc) => {
            const here = sc.id === session.sceneId;
            return (
              <button
                key={sc.id}
                disabled={here || busy}
                onClick={() => moveScene(sc.id)}
                className={`overflow-hidden rounded-lg border text-left transition ${here ? 'border-accent' : 'border-edge hover:border-slate-400'}`}
              >
                <AssetImage src={sc.image} alt={sc.name} kind="scene" label={sc.name} className="aspect-video w-full" />
                <div className="p-2">
                  <p className="text-sm font-semibold">{sc.name}</p>
                  <p className="text-[11px] text-slate-400">{here ? 'Você está aqui' : 'Ir para cá (+2 min)'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Scene() {
  const g = useGame();
  const { session, caseData, settings } = g;
  const hotspots = useMemo(
    () => caseData?.hotspots.filter((h) => h.sceneId === session?.sceneId) ?? [],
    [caseData, session?.sceneId],
  );
  if (!session || !caseData) return null;

  const scene = caseData.scenes.find((s) => s.id === session.sceneId)!;
  const found = Object.values(session.evidence).filter((e) => e.status !== 'nao_descoberta' && e.status !== 'perdida').length;
  const pendingLab = session.lab.filter((l) => l.status === 'em_analise').length;

  const isDone = (h: PublicHotspot) =>
    h.kind === 'evidence' ? session.evidence[h.evidenceId!]?.status !== 'nao_descoberta' : session.inspectedHotspots.includes(h.id);

  const debugClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!DEBUG) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    g.toast(`debug: "x": ${x}, "y": ${y}`);
    console.log(`"x": ${x}, "y": ${y}`);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-2 sm:p-4">
      {/* HUD (mobile: acima da cena) */}
      <div className="grid w-full grid-cols-3 gap-1 text-center text-[11px] font-bold sm:hidden">
        <span className="rounded-full bg-panel px-2 py-1">📋 {found}/{caseData.evidence.length}</span>
        <span className="rounded-full bg-panel px-2 py-1">🕒 {formatClock(session.clock)}</span>
        <span className="rounded-full bg-panel px-2 py-1">🧠 {session.liveScore}</span>
        <span className="col-span-3 text-slate-400">{scene.name}</span>
      </div>
      <div
        className="relative aspect-video w-full max-w-[min(100%,calc((100dvh-7rem)*16/9))] overflow-hidden rounded-xl border border-edge shadow-2xl"
        onClick={debugClick}
      >
        <AssetImage src={scene.image} alt={scene.name} kind="scene" label={scene.name} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

        {/* HUD (desktop: sobre a cena) */}
        <div className="absolute left-3 top-3 hidden rounded-full bg-black/70 px-3 py-1 text-sm font-bold sm:block">
          📋 Evidências: {found}/{caseData.evidence.length}
        </div>
        <div className="absolute left-1/2 top-3 hidden -translate-x-1/2 rounded-md border border-edge bg-black/75 px-3 py-1 text-center text-sm font-bold sm:block">
          {formatClock(session.clock)} · {scene.name}
        </div>
        <div className="absolute right-3 top-3 hidden rounded-full bg-black/70 px-3 py-1 text-sm font-bold sm:block">
          🧠 Pontuação: {session.liveScore}
        </div>

        {hotspots.map((h, i) => (
          <Hotspot key={h.id} h={h} index={i + 1} done={isDone(h)} showLabel={settings.showLabels} onClick={() => g.inspect(h.id)} />
        ))}

        {g.sceneMessage && (
          <div className="fade-up absolute inset-x-2 bottom-2 rounded-lg border border-edge bg-black/85 p-3 text-sm sm:inset-x-auto sm:left-1/2 sm:w-[70%] sm:-translate-x-1/2">
            <button className="float-right ml-2 text-slate-400 hover:text-white" onClick={(e) => { e.stopPropagation(); g.clearSceneMessage(); }} aria-label="Fechar">
              ✕
            </button>
            {g.sceneMessage}
          </div>
        )}
      </div>

      {/* Barra de ações */}
      <nav className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-2">
        <button className="btn" onClick={() => g.setInventory(true)}>
          🎒 Inventário
        </button>
        <button className="btn" onClick={() => g.setMap(true)}>
          🗺️ Mapa
        </button>
        <button className="btn" onClick={() => g.go('lab')}>
          🔬 Laboratório{pendingLab > 0 && <span className="ml-1 rounded bg-amber-600 px-1.5 text-[10px] text-black">{pendingLab}</span>}
        </button>
        <button className="btn" onClick={() => g.go('suspects')}>
          👥 Suspeitos
        </button>
        <button className="btn btn-primary" onClick={() => g.go('board')}>
          🗂️ Quadro Investigativo
        </button>
        <button className="btn btn-danger" onClick={() => g.go('accusation')}>
          ⚖️ Acusar
        </button>
        <button className="btn" onClick={() => g.go('menu')} title="Menu principal">
          ☰
        </button>
      </nav>

      {g.inventoryOpen && <InventoryDrawer />}
      {g.mapOpen && <MapOverlay />}
    </div>
  );
}
