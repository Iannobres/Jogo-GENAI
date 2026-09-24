import { formatClock } from '@caso404/shared';
import { AssetImage } from '../components/AssetImage';
import { useGame } from '../store/game';

export function Briefing() {
  const { caseData, go } = useGame();
  if (!caseData) return null;
  const victim = caseData.characters.find((c) => c.isVictim);
  const suspects = caseData.characters.filter((c) => !c.isVictim);

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="label">Relatório inicial · {formatClock(caseData.startClock)}</p>
        <h1 className="mt-1 text-3xl font-black tracking-wide">
          Morte na <span className="text-accent">Sala 404</span>
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {victim && (
          <figure className="panel overflow-hidden">
            <AssetImage src={victim.portrait} alt={victim.name} kind="portrait" className="aspect-[3/4] w-full" />
            <figcaption className="p-3">
              <p className="font-bold">{victim.name}</p>
              <p className="text-xs text-slate-400">{victim.role}</p>
            </figcaption>
          </figure>
        )}
        <div className="space-y-4 text-[15px] leading-relaxed text-slate-200">
          {caseData.briefing.map((p, i) => (
            <p key={i} className="fade-up" style={{ animationDelay: `${i * 0.15}s` }}>
              {p}
            </p>
          ))}
        </div>
      </div>

      <section>
        <p className="label mb-3">Pessoas de interesse</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {suspects.map((s) => (
            <div key={s.id} className="panel overflow-hidden">
              <AssetImage src={s.portrait} alt={s.name} kind="portrait" className="aspect-square w-full" />
              <div className="p-2">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-[11px] text-slate-400">{s.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn btn-primary px-8 py-3 uppercase tracking-[0.2em]" onClick={() => go('scene')}>
          Começar investigação →
        </button>
      </div>
    </div>
  );
}
