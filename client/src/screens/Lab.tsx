import { formatClock, LAB_TEST_LABEL, LAB_TESTS } from '@caso404/shared';
import { AssetImage } from '../components/AssetImage';
import { ScreenHeader, StatusBadge } from '../components/ui';
import { useGame } from '../store/game';

export function Lab() {
  const { session, caseData, sendToLab, waitLab, busy } = useGame();
  if (!session || !caseData) return null;

  const items = caseData.evidence.filter((e) => {
    const st = session.evidence[e.id]?.status;
    return st && st !== 'nao_descoberta' && st !== 'perdida';
  });
  const pending = session.lab.filter((l) => l.status === 'em_analise');
  const next = pending.length ? Math.min(...pending.map((l) => l.readyAt)) : null;

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader
        title="Laboratório forense"
        subtitle={`Relógio: ${formatClock(session.clock)}. Cada exame leva cerca de 40 minutos do relógio do caso.`}
        right={
          <button className="btn btn-primary" disabled={!next || busy} onClick={waitLab}>
            {next ? `Aguardar laudo (${formatClock(next)})` : 'Sem exames pendentes'}
          </button>
        }
      />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-3 p-4 sm:p-6">
        {items.length === 0 && <p className="text-slate-400">Colete evidências na cena para enviá-las ao laboratório.</p>}
        {items.map((e) => {
          const jobs = session.lab.filter((l) => l.evidenceId === e.id);
          return (
            <article key={e.id} className="panel flex flex-col gap-4 p-4 sm:flex-row">
              <AssetImage src={e.image} alt={e.name} kind="evidence" label={e.name} className="aspect-[4/3] w-full rounded-md sm:w-40" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{e.name}</h2>
                  <StatusBadge status={session.evidence[e.id].status} />
                </div>
                <p className="mt-1 text-sm text-slate-400">{e.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {LAB_TESTS.map((t) => {
                    const job = jobs.find((j) => j.test === t);
                    return (
                      <button key={t} className="btn px-3 py-1.5 text-xs" disabled={!!job || busy} onClick={() => sendToLab(e.id, t)}>
                        {LAB_TEST_LABEL[t]}
                        {job && <span className="font-normal normal-case tracking-normal text-slate-400">{job.status === 'concluido' ? 'concluído' : 'em análise'}</span>}
                      </button>
                    );
                  })}
                </div>
                {jobs.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {jobs.map((j) => (
                      <li key={j.test} className="rounded bg-black/30 px-3 py-2">
                        <span className="label">{LAB_TEST_LABEL[j.test]}: </span>
                        {j.result ?? <span className="text-amber-300">em análise, pronto às {formatClock(j.readyAt)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
