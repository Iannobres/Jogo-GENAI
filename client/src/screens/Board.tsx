import { formatClock, type BoardState } from '@caso404/shared';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState, type ReactNode } from 'react';
import { AssetImage } from '../components/AssetImage';
import { IconClose } from '../components/icons';
import { ScreenHeader } from '../components/ui';
import { useGame } from '../store/game';

type Tab = 'timeline' | 'suspects' | 'notes';

/** Item arrastável que também pode ser selecionado com um toque/clique. */
function Chip({ id, children, selected, onSelect }: { id: string; children: ReactNode; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={`touch-none rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold shadow transition ${
        isDragging ? 'z-50 border-accent bg-accent-strong opacity-90' : selected ? 'border-clue bg-amber-950/60' : 'border-edge bg-slate-800 hover:border-slate-500'
      }`}
    >
      {children}
    </button>
  );
}

function Drop({ id, children, className, onClick }: { id: string; children: ReactNode; className?: string; onClick?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} onClick={onClick} className={`${className ?? ''} ${isOver ? '!border-accent bg-accent-strong/20' : ''}`}>
      {children}
    </div>
  );
}

export function Board() {
  const { session, caseData, saveBoard } = useGame();
  const [tab, setTab] = useState<Tab>('timeline');
  const [selected, setSelected] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  if (!session || !caseData) return null;

  const board = session.board;
  const events = session.timelineEvents;
  const placed = new Set(Object.values(board.timeline));
  const suspects = caseData.characters.filter((c) => !c.isVictim);
  const evidence = caseData.evidence.filter((e) => {
    const st = session.evidence[e.id]?.status;
    return st && st !== 'nao_descoberta' && st !== 'perdida';
  });

  const commit = (next: BoardState) => {
    setSelected(null);
    saveBoard(next);
  };

  /** Coloca um item (evento ou evidência) num alvo (slot, pool ou suspeito). */
  function place(itemId: string, targetId: string) {
    if (itemId.startsWith('ev:') && (targetId.startsWith('slot:') || targetId === 'pool')) {
      const eventId = itemId.slice(3);
      const timeline = Object.fromEntries(Object.entries(board.timeline).filter(([, e]) => e !== eventId));
      if (targetId.startsWith('slot:')) timeline[targetId.slice(5)] = eventId;
      commit({ ...board, timeline });
    }
    if (itemId.startsWith('evd:') && targetId.startsWith('sus:')) {
      const evId = itemId.slice(4);
      const susId = targetId.slice(4);
      const current = board.links[evId] ?? [];
      if (current.includes(susId)) return setSelected(null);
      commit({ ...board, links: { ...board.links, [evId]: [...current, susId] } });
    }
  }

  const onDragEnd = (e: DragEndEvent) => {
    if (e.over) place(String(e.active.id), String(e.over.id));
  };
  const tapTarget = (targetId: string) => selected && place(selected, targetId);
  const toggle = (id: string) => setSelected((s) => (s === id ? null : id));

  const unlink = (evId: string, susId: string) =>
    commit({ ...board, links: { ...board.links, [evId]: (board.links[evId] ?? []).filter((s) => s !== susId) } });
  const cycleMark = (susId: string) => {
    const order = ['neutro', 'suspeito', 'descartado'] as const;
    const cur = board.marks[susId] ?? 'neutro';
    commit({ ...board, marks: { ...board.marks, [susId]: order[(order.indexOf(cur) + 1) % order.length] } });
  };

  const tabs: [Tab, string][] = [
    ['timeline', 'Linha do tempo'],
    ['suspects', 'Suspeitos e evidências'],
    ['notes', `Caderno (${session.facts.length})`],
  ];

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Quadro investigativo" subtitle="Arraste (ou toque e depois toque no destino) para montar sua teoria. O quadro é salvo automaticamente." />
      <div className="flex gap-1 border-b border-edge px-4 pt-3 sm:px-6">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-t-md px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-panel text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {tab === 'timeline' && (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <ol className="relative space-y-2 border-l-2 border-edge pl-4">
                {caseData.timelineSlots.map((slot) => {
                  const evId = board.timeline[slot.id];
                  const ev = events.find((e) => e.id === evId);
                  return (
                    <li key={slot.id} className="relative">
                      <span className="absolute -left-[23px] top-3 h-3 w-3 rounded-full border-2 border-accent bg-ink" />
                      <Drop
                        id={`slot:${slot.id}`}
                        onClick={() => tapTarget(`slot:${slot.id}`)}
                        className="flex min-h-12 items-center gap-3 rounded-md border border-dashed border-edge px-3 py-2"
                      >
                        <span className="w-14 shrink-0 font-mono text-sm font-bold text-accent">{formatClock(slot.time)}</span>
                        {ev ? (
                          <Chip id={`ev:${ev.id}`} selected={selected === `ev:${ev.id}`} onSelect={() => toggle(`ev:${ev.id}`)}>
                            {ev.text}
                          </Chip>
                        ) : (
                          <span className="text-xs text-slate-500">solte um evento aqui</span>
                        )}
                      </Drop>
                    </li>
                  );
                })}
              </ol>
              <Drop id="pool" onClick={() => tapTarget('pool')} className="panel h-fit space-y-2 p-3 lg:sticky lg:top-4">
                <p className="label">Eventos descobertos ({events.length}/{caseData.timelineSlots.length})</p>
                {events.length === 0 && <p className="text-xs text-slate-400">Explore a cena e interrogue os suspeitos para descobrir eventos.</p>}
                <div className="flex flex-col gap-1.5">
                  {events
                    .filter((e) => !placed.has(e.id))
                    .map((e) => (
                      <Chip key={e.id} id={`ev:${e.id}`} selected={selected === `ev:${e.id}`} onSelect={() => toggle(`ev:${e.id}`)}>
                        {e.text}
                      </Chip>
                    ))}
                </div>
              </Drop>
            </div>
          )}

          {tab === 'suspects' && (
            <div className="space-y-4">
              <div className="panel flex flex-wrap gap-1.5 p-3">
                <span className="label w-full">Evidências (arraste até um suspeito)</span>
                {evidence.map((e) => (
                  <Chip key={e.id} id={`evd:${e.id}`} selected={selected === `evd:${e.id}`} onSelect={() => toggle(`evd:${e.id}`)}>
                    {e.name}
                  </Chip>
                ))}
                {evidence.length === 0 && <span className="text-xs text-slate-400">Nenhuma evidência coletada.</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {suspects.map((s) => {
                  const mark = board.marks[s.id] ?? 'neutro';
                  const linked = Object.entries(board.links).filter(([, sus]) => sus.includes(s.id)).map(([evId]) => evId);
                  const facts = session.facts.filter((f) => f.about.includes(s.id));
                  return (
                    <Drop
                      key={s.id}
                      id={`sus:${s.id}`}
                      onClick={() => tapTarget(`sus:${s.id}`)}
                      className={`panel flex flex-col overflow-hidden ${mark === 'suspeito' ? 'border-red-600' : mark === 'descartado' ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2 p-2">
                        <AssetImage src={s.portrait} alt={s.name} kind="portrait" className="h-12 w-12 rounded-md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{s.name}</p>
                          <button
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              cycleMark(s.id);
                            }}
                          >
                            <span
                              className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${mark === 'suspeito' ? 'bg-red-500' : mark === 'descartado' ? 'bg-slate-500' : 'border border-slate-500'}`}
                            />
                            {mark === 'suspeito' ? 'Principal suspeito' : mark === 'descartado' ? 'Descartado' : 'Marcar'}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 px-2 pb-2">
                        {linked.map((evId) => (
                          <button
                            key={evId}
                            onClick={(e) => {
                              e.stopPropagation();
                              unlink(evId, s.id);
                            }}
                            title="Remover ligação"
                            className="rounded bg-accent-strong/60 px-1.5 py-0.5 text-[10px] hover:bg-red-800"
                          >
                            {caseData.evidence.find((x) => x.id === evId)?.name}
                            <IconClose className="ml-1 inline h-3 w-3 align-[-2px]" />
                          </button>
                        ))}
                      </div>
                      <ul className="flex-1 space-y-1 border-t border-edge p-2 text-[11px] text-slate-300">
                        {facts.length === 0 && <li className="text-slate-500">Sem fatos registrados.</li>}
                        {facts.map((f) => (
                          <li key={f.id}>• {f.text}</li>
                        ))}
                      </ul>
                    </Drop>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <ul className="space-y-2">
              {session.facts.length === 0 && <p className="text-slate-400">Nenhum fato registrado ainda.</p>}
              {[...session.facts].reverse().map((f) => (
                <li key={f.id} className="panel flex gap-3 p-3 text-sm">
                  <span className="shrink-0 font-mono text-xs text-accent">{formatClock(f.at)}</span>
                  <span className="flex-1">{f.text}</span>
                  <span className="hidden shrink-0 text-[11px] text-slate-500 sm:block">{f.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DndContext>
    </div>
  );
}
