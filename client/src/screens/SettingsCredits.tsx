import type { ReactNode } from 'react';
import { IconBack } from '../components/icons';
import { useGame } from '../store/game';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const go = useGame((s) => s.go);
  const hasSession = useGame((s) => !!s.session && !s.session.finished);
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <button className="btn pl-2.5" onClick={() => go(hasSession ? 'scene' : 'menu')}>
          <IconBack />
          Voltar
        </button>
        <h1 className="text-2xl font-black tracking-wide">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="panel flex cursor-pointer items-center justify-between gap-4 p-4">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-slate-400">{hint}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 accent-[#5aa0f0]" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Settings() {
  const { settings, updateSettings, health } = useGame();
  return (
    <Shell title="Configurações">
      <Toggle
        label="Efeito de máquina de escrever"
        hint="As falas dos suspeitos aparecem letra por letra."
        value={settings.typewriter}
        onChange={(v) => updateSettings({ typewriter: v })}
      />
      <div className="panel p-4 text-sm">
        <p className="label mb-2">Motor de diálogo</p>
        {health && health.provider !== 'mock' ? (
          <p>
            Conectado ao <b>{health.provider === 'gemini' ? 'Gemini' : 'Claude'}</b> ({health.model}). As falas são geradas em
            tempo real e validadas pelo servidor.
          </p>
        ) : (
          <p>
            Modo <b>roteirizado</b>: as falas vêm do roteiro do caso. Para usar IA, defina <code>GEMINI_API_KEY</code> (ou{' '}
            <code>ANTHROPIC_API_KEY</code>) no arquivo <code>.env</code> e reinicie o servidor.
          </p>
        )}
      </div>
    </Shell>
  );
}

export function Credits() {
  const rows: [string, string, string][] = [
    ['Diálogos dos suspeitos (tempo real)', 'Gemini (Google), via API', 'Texto'],
    ['Retratos e cenas', 'Bing Image Creator (DALL·E 3)', 'Imagem'],
    ['Ilustrações das evidências (SVG)', 'Claude Code (Anthropic)', 'Imagem vetorial'],
    ['Roteiro do caso, código e documentação', 'Claude Code (Anthropic), com revisão do grupo', 'Texto/Código'],
  ];
  return (
    <Shell title="Créditos">
      <div className="panel p-5">
        <p className="label mb-2">Equipe</p>
        <p className="text-lg font-semibold">Gustavo Balbo Saraiva · Ian Nobres · Matheus Mikio</p>
        <p className="mt-1 text-sm text-slate-400">Checkpoint 4: IA Generativa e Game Design. NLP, Chatbots e Agentes Virtuais, FIAP.</p>
      </div>
      <div className="panel overflow-x-auto p-5">
        <p className="label mb-3">Conteúdo gerado por IA</p>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="pb-2 pr-3">Elemento</th>
              <th className="pb-2 pr-3">Ferramenta</th>
              <th className="pb-2">Modalidade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a} className="border-t border-edge">
                <td className="py-2 pr-3">{a}</td>
                <td className="py-2 pr-3">{b}</td>
                <td className="py-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel p-5 text-sm text-slate-300">
        <p className="label mb-2">Referências de design</p>
        <p>Return of the Obra Dinn (Lucas Pope, 2018): dedução e reconstituição da linha do tempo.</p>
        <p>L.A. Noire (Team Bondi / Rockstar, 2011): interrogatório e confronto com evidências.</p>
      </div>
    </Shell>
  );
}
