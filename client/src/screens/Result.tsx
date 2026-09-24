import { AssetImage } from '../components/AssetImage';
import { useGame } from '../store/game';

const GRADE_TEXT: Record<string, string> = {
  S: 'Investigação impecável',
  A: 'Excelente trabalho de detetive',
  B: 'Caso resolvido, com lacunas',
  C: 'Investigação incompleta',
  D: 'O caso escapou das suas mãos',
};

export function Result() {
  const { session, caseData, newGame, go } = useGame();
  const r = session?.result;
  if (!session || !caseData || !r) return null;
  const accused = caseData.characters.find((c) => c.id === r.accusation.suspectId)!;
  const culprit = caseData.characters.find((c) => c.name === r.solution.culpritName);

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="fade-up text-center">
        <p className="label">Veredito</p>
        <h1 className={`mt-2 text-4xl font-black ${r.correct ? 'text-emerald-400' : 'text-red-400'}`}>
          {r.correct ? 'Culpado identificado!' : 'Acusação equivocada'}
        </h1>
        <p className="mt-2 text-slate-300">
          Você acusou <b>{accused.name}</b>.
          {!r.correct && (
            <>
              {' '}
              O verdadeiro culpado era <b>{r.solution.culpritName}</b>.
            </>
          )}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="panel flex flex-col items-center justify-center p-6 text-center">
          <p className="label">Nota</p>
          <p className="text-7xl font-black text-accent">{r.grade}</p>
          <p className="mt-1 text-2xl font-bold">
            {r.total}
            <span className="text-base text-slate-400">/{r.max}</span>
          </p>
          <p className="mt-2 text-xs text-slate-400">{GRADE_TEXT[r.grade]}</p>
        </div>
        <div className="panel overflow-x-auto p-4">
          <table className="w-full text-sm">
            <tbody>
              {r.breakdown.map((b) => (
                <tr key={b.label} className="border-b border-edge last:border-0">
                  <td className="py-2 pr-2">
                    {b.label}
                    {b.detail && <span className="block text-[11px] text-slate-500">{b.detail}</span>}
                  </td>
                  <td className="w-40 py-2">
                    <div className="h-2 rounded bg-slate-800">
                      <div className="h-2 rounded bg-accent" style={{ width: `${(b.points / b.max) * 100}%` }} />
                    </div>
                  </td>
                  <td className="w-16 py-2 text-right font-mono">
                    {b.points}/{b.max}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="panel p-5">
        <div className="mb-4 flex items-center gap-3">
          {culprit && <AssetImage src={culprit.portrait} alt={culprit.name} kind="portrait" className="h-16 w-16 rounded-lg" />}
          <div>
            <p className="label">Reconstituição do crime</p>
            <p className="text-sm text-slate-300">
              <b>{r.solution.culpritName}</b> · {r.solution.motive} · {r.solution.method}
            </p>
          </div>
        </div>
        <ol className="space-y-3 text-[15px] leading-relaxed text-slate-200">
          {r.reconstruction.map((p, i) => (
            <li key={i} className="fade-up border-l-2 border-accent/50 pl-3" style={{ animationDelay: `${i * 0.12}s` }}>
              {p}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary px-6" onClick={newGame}>
          Jogar novamente
        </button>
        <button className="btn px-6" onClick={() => go('menu')}>
          Menu principal
        </button>
      </div>
    </div>
  );
}
