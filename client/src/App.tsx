import type { JSX } from 'react';
import { useEffect } from 'react';
import { Toasts } from './components/ui';
import { Accusation } from './screens/Accusation';
import { Board } from './screens/Board';
import { Briefing } from './screens/Briefing';
import { Interrogation } from './screens/Interrogation';
import { Lab } from './screens/Lab';
import { Menu } from './screens/Menu';
import { Result } from './screens/Result';
import { Scene } from './screens/Scene';
import { Credits, Settings } from './screens/SettingsCredits';
import { Suspects } from './screens/Suspects';
import { Tutorial } from './screens/Tutorial';
import { useGame, type Screen } from './store/game';
import { NEEDS_SESSION } from './store/routes';

const SCREENS: Record<Screen, () => JSX.Element | null> = {
  menu: Menu,
  briefing: Briefing,
  scene: Scene,
  lab: Lab,
  suspects: Suspects,
  interrogation: Interrogation,
  board: Board,
  accusation: Accusation,
  result: Result,
  settings: Settings,
  tutorial: Tutorial,
  credits: Credits,
};

export function App() {
  const { boot, booted, bootError, screen, session, suspectId, go } = useGame();

  useEffect(() => {
    boot();
  }, [boot]);

  // Redirecionamentos usam replace para não prender o botão "voltar" do navegador.
  useEffect(() => {
    if (!booted) return;
    if (NEEDS_SESSION.includes(screen) && !session) go('menu', undefined, { replace: true });
    // Caso encerrado: só a tela de resultado faz sentido.
    else if (session?.finished && ['briefing', 'scene', 'lab', 'suspects', 'interrogation', 'board', 'accusation'].includes(screen))
      go('result', undefined, { replace: true });
    else if (session && !session.finished && screen === 'result') go('scene', undefined, { replace: true });
    // Link de interrogatório com suspeito inexistente.
    else if (screen === 'interrogation' && session && !(suspectId && session.suspects[suspectId])) go('suspects', undefined, { replace: true });
  }, [booted, screen, session, suspectId, go]);

  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="panel max-w-md p-6">
          <p className="text-lg font-bold text-red-300">Servidor indisponível</p>
          <p className="mt-2 text-sm text-slate-300">{bootError}</p>
          <button className="btn mt-4" onClick={boot}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!booted) return null;
  const Current = SCREENS[screen];
  return (
    <>
      <Current />
      <Toasts />
    </>
  );
}
