import { create } from 'zustand';
import type {
  AccusationInput,
  BoardState,
  DialogueLine,
  HealthResponse,
  InspectResponse,
  InterrogateRequest,
  KnownFact,
  LabTest,
  PublicCase,
  SessionView,
} from '@caso404/shared';
import { api } from '../api';

export type Screen =
  | 'menu'
  | 'briefing'
  | 'scene'
  | 'lab'
  | 'suspects'
  | 'interrogation'
  | 'board'
  | 'accusation'
  | 'result'
  | 'settings'
  | 'credits';

export interface Toast {
  id: number;
  text: string;
  kind: 'fact' | 'info' | 'error';
}

export interface Settings {
  typewriter: boolean;
  showLabels: boolean;
}

const SESSION_KEY = 'caso404.session';
const SETTINGS_KEY = 'caso404.settings';

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* armazenamento indisponível: segue sem salvar */
    }
  },
};

function loadSettings(): Settings {
  const fallback: Settings = { typewriter: true, showLabels: false };
  try {
    return { ...fallback, ...JSON.parse(storage.get(SETTINGS_KEY) ?? '{}') };
  } catch {
    return fallback;
  }
}

interface GameStore {
  caseData: PublicCase | null;
  health: HealthResponse | null;
  session: SessionView | null;
  savedSessionId: string | null;
  screen: Screen;
  previousScreen: Screen;
  suspectId: string | null;
  inventoryOpen: boolean;
  mapOpen: boolean;
  sceneMessage: string | null;
  toasts: Toast[];
  busy: boolean;
  bootError: string | null;
  settings: Settings;

  boot(): Promise<void>;
  go(screen: Screen, suspectId?: string): void;
  back(): void;
  setInventory(open: boolean): void;
  setMap(open: boolean): void;
  toast(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
  updateSettings(patch: Partial<Settings>): void;

  newGame(): Promise<void>;
  continueGame(): Promise<void>;
  moveScene(sceneId: string): Promise<void>;
  inspect(hotspotId: string): Promise<void>;
  sendToLab(evidenceId: string, test: LabTest): Promise<void>;
  waitLab(): Promise<void>;
  interrogate(body: Omit<InterrogateRequest, 'suspectId'>): Promise<DialogueLine[] | null>;
  saveBoard(board: BoardState): Promise<void>;
  accuse(acc: AccusationInput): Promise<void>;
  clearSceneMessage(): void;
}

let toastSeq = 0;

export const useGame = create<GameStore>((set, get) => {
  /** Executa uma chamada, trata erro com toast e evita cliques duplos. */
  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    if (get().busy) return null;
    set({ busy: true });
    try {
      return await fn();
    } catch (err) {
      get().toast((err as Error).message, 'error');
      return null;
    } finally {
      set({ busy: false });
    }
  }

  function announce(facts: KnownFact[]) {
    for (const f of facts) get().toast(f.text, 'fact');
  }

  function applyInspect(r: InspectResponse | null) {
    if (!r) return;
    set({ session: r.session });
    announce(r.newFacts);
    if (r.message) set({ sceneMessage: r.message });
  }

  function setSession(s: SessionView) {
    storage.set(SESSION_KEY, s.id);
    set({ session: s, savedSessionId: s.id });
  }

  return {
    caseData: null,
    health: null,
    session: null,
    savedSessionId: storage.get(SESSION_KEY),
    screen: 'menu',
    previousScreen: 'menu',
    suspectId: null,
    inventoryOpen: false,
    mapOpen: false,
    sceneMessage: null,
    toasts: [],
    busy: false,
    bootError: null,
    settings: loadSettings(),

    async boot() {
      try {
        const [caseData, health] = await Promise.all([api.getCase(), api.health()]);
        set({ caseData, health, bootError: null });
      } catch {
        set({ bootError: 'Não foi possível falar com o servidor. Rode "npm run dev" na raiz do projeto.' });
      }
    },

    go(screen, suspectId) {
      set((st) => ({
        screen,
        previousScreen: st.screen,
        suspectId: suspectId ?? st.suspectId,
        inventoryOpen: false,
        mapOpen: false,
      }));
    },
    back() {
      get().go(get().previousScreen === get().screen ? 'scene' : get().previousScreen);
    },
    setInventory: (open) => set({ inventoryOpen: open, mapOpen: false }),
    setMap: (open) => set({ mapOpen: open, inventoryOpen: false }),

    toast(text, kind = 'info') {
      const id = ++toastSeq;
      set((st) => ({ toasts: [...st.toasts.slice(-3), { id, text, kind }] }));
      setTimeout(() => get().dismissToast(id), kind === 'fact' ? 6500 : 4500);
    },
    dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      storage.set(SETTINGS_KEY, JSON.stringify(settings));
      set({ settings });
    },

    async newGame() {
      const s = await run(() => api.newSession());
      if (s) {
        setSession(s);
        set({ sceneMessage: null });
        get().go('briefing');
      }
    },

    async continueGame() {
      const id = get().savedSessionId;
      if (!id) return;
      const s = await run(() => api.getSession(id));
      if (!s) {
        storage.set(SESSION_KEY, null);
        set({ savedSessionId: null });
        return;
      }
      setSession(s);
      get().go(s.finished ? 'result' : 'scene');
    },

    async moveScene(sceneId) {
      const s = get().session;
      if (!s) return;
      applyInspect(await run(() => api.moveScene(s.id, sceneId)));
      set({ mapOpen: false, sceneMessage: null });
    },

    async inspect(hotspotId) {
      const s = get().session;
      if (!s) return;
      applyInspect(await run(() => api.inspect(s.id, hotspotId)));
    },

    async sendToLab(evidenceId, test) {
      const s = get().session;
      if (!s) return;
      const r = await run(() => api.sendToLab(s.id, evidenceId, test));
      if (r) {
        set({ session: r.session });
        announce(r.newFacts);
        get().toast(r.message);
      }
    },

    async waitLab() {
      const s = get().session;
      if (!s) return;
      const r = await run(() => api.waitLab(s.id));
      if (r) {
        set({ session: r.session });
        announce(r.newFacts);
        if (!r.newFacts.length) get().toast('Laudo pronto. Nenhum fato novo.');
      }
    },

    async interrogate(body) {
      const s = get().session;
      const suspectId = get().suspectId;
      if (!s || !suspectId) return null;
      const r = await run(() => api.interrogate(s.id, { ...body, suspectId }));
      if (!r) return null;
      set({ session: r.session });
      announce(r.newFacts);
      return r.lines;
    },

    async saveBoard(board) {
      const s = get().session;
      if (!s) return;
      const r = await run(() => api.saveBoard(s.id, board));
      if (r) set({ session: r });
    },

    async accuse(acc) {
      const s = get().session;
      if (!s) return;
      const r = await run(() => api.accuse(s.id, acc));
      if (r) {
        set({ session: r });
        get().go('result');
      }
    },

    clearSceneMessage: () => set({ sceneMessage: null }),
  };
});

/** Atalhos de leitura do caso público. */
export function useCaseLookup() {
  const caseData = useGame((s) => s.caseData);
  return {
    character: (id: string) => caseData?.characters.find((c) => c.id === id),
    evidence: (id: string) => caseData?.evidence.find((e) => e.id === id),
    scene: (id: string) => caseData?.scenes.find((s) => s.id === id),
  };
}
