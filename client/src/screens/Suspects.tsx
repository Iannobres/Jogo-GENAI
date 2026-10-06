import { AssetImage } from '../components/AssetImage';
import { EmotionBadge, ScreenHeader } from '../components/ui';
import { useGame } from '../store/game';

export function Suspects() {
  const { session, caseData, go } = useGame();
  if (!session || !caseData) return null;
  const suspects = caseData.characters.filter((c) => !c.isVictim);

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title="Suspeitos" subtitle={`Até ${caseData.questionLimit} perguntas por suspeito. Cada pergunta consome 3 minutos.`} />
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-start grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-6 lg:grid-cols-3 xl:grid-cols-5">
        {suspects.map((s) => {
          const sv = session.suspects[s.id];
          const claims = session.heardClaims.filter((c) => c.suspectId === s.id).length;
          return (
            <button key={s.id} onClick={() => go('interrogation', s.id)} className="panel group flex flex-col overflow-hidden text-left transition hover:border-accent">
              <div className="relative">
                <AssetImage src={s.portrait} alt={s.name} kind="portrait" className="aspect-[3/4] w-full transition group-hover:scale-[1.02]" />
                <div className="absolute right-2 top-2">
                  <EmotionBadge emotion={sv.emotion} />
                </div>
              </div>
              <div className="space-y-1 p-3">
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-slate-400">{s.role}</p>
                <p className="text-xs text-slate-300">{s.summary}</p>
                <p className="pt-1 text-[11px] text-slate-500">
                  {sv.questionsUsed}/{caseData.questionLimit} perguntas · {claims} declaração(ões) registrada(s)
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
