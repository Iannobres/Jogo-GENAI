import type { Screen } from './game';

// Caminho de cada tela. O interrogatório leva o id do suspeito: /interrogatorio/joao.
const PATHS: Record<Screen, string> = {
  menu: '/',
  briefing: '/briefing',
  scene: '/cena',
  lab: '/laboratorio',
  suspects: '/suspeitos',
  interrogation: '/interrogatorio',
  board: '/quadro',
  accusation: '/acusacao',
  result: '/resultado',
  settings: '/configuracoes',
  tutorial: '/como-jogar',
  credits: '/creditos',
};

const TITLES: Record<Screen, string> = {
  menu: '',
  briefing: 'Relatório inicial',
  scene: 'Cena',
  lab: 'Laboratório',
  suspects: 'Suspeitos',
  interrogation: 'Interrogatório',
  board: 'Quadro investigativo',
  accusation: 'Acusação',
  result: 'Resultado',
  settings: 'Configurações',
  tutorial: 'Como jogar',
  credits: 'Créditos',
};

/** Telas de jogo que exigem uma sessão ativa. */
export const NEEDS_SESSION: Screen[] = ['briefing', 'scene', 'lab', 'suspects', 'interrogation', 'board', 'accusation', 'result'];

export function pathFor(screen: Screen, suspectId?: string | null): string {
  return screen === 'interrogation' && suspectId ? `${PATHS.interrogation}/${suspectId}` : PATHS[screen];
}

/** Lê a tela (e o suspeito, se houver) da URL. Caminho desconhecido volta ao menu. */
export function parsePath(pathname: string): { screen: Screen; suspectId?: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean.startsWith(`${PATHS.interrogation}/`)) {
    const id = decodeURIComponent(clean.slice(PATHS.interrogation.length + 1));
    if (id) return { screen: 'interrogation', suspectId: id };
  }
  const found = (Object.keys(PATHS) as Screen[]).find((s) => PATHS[s] === clean && s !== 'interrogation');
  return { screen: found ?? 'menu' };
}

/** Atualiza a URL e o título da aba. Mantém a query (ex.: ?debug). */
export function syncUrl(screen: Screen, suspectId: string | null | undefined, mode: 'push' | 'replace') {
  const path = pathFor(screen, suspectId) + location.search;
  if (location.pathname + location.search !== path) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', path);
  document.title = TITLES[screen] ? `${TITLES[screen]} · CASO 404` : 'CASO 404';
}
