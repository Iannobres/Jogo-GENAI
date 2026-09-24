import { useState } from 'react';
import { AssetImage } from '../components/AssetImage';
import { ScreenHeader } from '../components/ui';
import { useGame } from '../store/game';

export function Accusation() {
  const { session, caseData, accuse, busy } = useGame();
  const [suspectId, setSuspect] = useState<string | null>(null);
  const [motiveId, setMotive] = useState<string | null>(null);
  const [methodId, setMethod] = useState<string | null>(null);
  const [evidenceIds, setEvidence] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  if (!session || !caseData) return null;

  const suspects = caseData.characters.filter((c) => !c.isVictim);
  const evidence = caseData.evidence.filter((e) => {
    const st = session.evidence[e.id]?.status;
    return st && st !== 'nao_descoberta' && st !== 'perdida';
  });
  const ready = suspectId && motiveId && methodId;

  const toggleEvidence = (id: string) =>
    setEvidence((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 3 ? [...cur, id] : cur));

  const pick = (active: boolean) =>
    `rounded-md border px-3 py-2 text-left text-sm transition ${active ? 'border-red-500 bg-red-950/50' : 'border-edge hover:border-slate-500'}`;

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="⚖️ Acusação final" subtitle="Só há uma chance. A nota reflete toda a investigação, não apenas o nome do culpado." />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:p-6">
        <section>
          <p className="label mb-2">1. Quem matou Carlos Mendes?</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {suspects.map((s) => (
              <button key={s.id} onClick={() => setSuspect(s.id)} className={`panel overflow-hidden text-left ${suspectId === s.id ? '!border-red-500 ring-2 ring-red-600' : ''}`}>
                <AssetImage src={s.portrait} alt={s.name} kind="portrait" className="aspect-square w-full" />
                <p className="p-2 text-sm font-bold">{s.name}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <p className="label mb-2">2. Motivo</p>
            <div className="flex flex-col gap-2">
              {caseData.motives.map((m) => (
                <button key={m.id} className={pick(motiveId === m.id)} onClick={() => setMotive(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="label mb-2">3. Método</p>
            <div className="flex flex-col gap-2">
              {caseData.methods.map((m) => (
                <button key={m.id} className={pick(methodId === m.id)} onClick={() => setMethod(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section>
          <p className="label mb-2">4. Evidências-chave (até 3)</p>
          <div className="flex flex-wrap gap-2">
            {evidence.length === 0 && <p className="text-sm text-slate-400">Nenhuma evidência coletada.</p>}
            {evidence.map((e) => (
              <button key={e.id} className={pick(evidenceIds.includes(e.id))} onClick={() => toggleEvidence(e.id)}>
                {e.name}
              </button>
            ))}
          </div>
        </section>

        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          {confirming ? (
            <>
              <p className="text-sm">Confirmar a acusação? O caso será encerrado.</p>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setConfirming(false)}>
                  Revisar
                </button>
                <button
                  className="btn btn-danger"
                  disabled={busy}
                  onClick={() => accuse({ suspectId: suspectId!, motiveId: motiveId!, methodId: methodId!, evidenceIds })}
                >
                  Confirmar acusação
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">{ready ? 'Tudo pronto para acusar.' : 'Escolha culpado, motivo e método.'}</p>
              <button className="btn btn-danger px-6" disabled={!ready} onClick={() => setConfirming(true)}>
                Fazer acusação
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
