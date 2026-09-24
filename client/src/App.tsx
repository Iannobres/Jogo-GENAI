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
import { useGame, type Screen } from './store/game';

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
  credits: Credits,
};

// Telas de jogo que exigem sessão ativa (sem ela, volta ao menu).
const NEEDS_SESSION: Screen[] = ['briefing', 'scene', 'lab', 'suspects', 'interrogation', 'board', 'accusation', 'result'];

export function App() {
  const { boot, bootError, screen, session, go } = useGame();

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (NEEDS_SESSION.includes(screen) && !session) go('menu');
    // Caso encerrado: só a tela de resultado faz sentido.
    if (session?.finished && ['scene', 'lab', 'suspects', 'interrogation', 'board', 'accusation'].includes(screen)) go('result');
  }, [screen, session, go]);

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

  const Current = SCREENS[screen];
  return (
    <>
      <Current />
      <Toasts />
    </>
  );
}
