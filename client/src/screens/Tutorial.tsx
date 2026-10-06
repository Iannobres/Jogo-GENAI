import { useEffect, useState, type ReactNode } from 'react';
import { AssetImage } from '../components/AssetImage';
import { IconBack, IconNext } from '../components/icons';
import { useGame } from '../store/game';

interface Step {
  tag: string;
  title: string;
  body: ReactNode;
  tips: string[];
  /** Imagem do caso para ilustrar o passo. */
  image?: { kind: 'scene' | 'portrait'; id: string };
}

const STEPS: Step[] = [
  {
    tag: 'Objetivo',
    title: 'Descubra quem matou Carlos Mendes',
    body: (
      <>
        O empresário foi encontrado morto às 23h40, numa sala trancada por dentro. Cinco pessoas tinham motivo. Você precisa descobrir{' '}
        <b>quem</b> foi, <b>por quê</b> e <b>como</b>, e provar isso com evidências.
      </>
    ),
    tips: [
      'O relógio do caso começa às 23h55 e avança a cada ação: examinar, viajar, interrogar, enviar ao laboratório.',
      'Algumas evidências se perdem se você demorar demais para encontrá-las.',
      'Seu progresso é salvo automaticamente no servidor.',
    ],
    image: { kind: 'scene', id: 'sala404' },
  },
  {
    tag: 'Cena',
    title: 'Explore os ambientes',
    body: (
      <>
        A cena não mostra onde estão as pistas. Passe o mouse pela imagem: quando algo puder ser examinado, aparecem <b>cantos de destaque</b>{' '}
        ao redor do objeto. Clique para examinar ou coletar.
      </>
    ),
    tips: [
      'Objetos coletados vão para o Inventário; detalhes do ambiente viram fatos no Caderno.',
      'Use o Mapa para ir à copa/corredor e à sala de monitoramento (+2 minutos).',
      'No celular, toque nos objetos que parecerem importantes.',
    ],
    image: { kind: 'scene', id: 'corredor' },
  },
  {
    tag: 'Inventário',
    title: 'Acompanhe suas evidências',
    body: <>O Inventário guarda tudo que você coletou, com a descrição de cada item e os laudos que já saíram.</>,
    tips: [
      'Cada evidência tem um status: descoberta, em análise, analisada ou perdida.',
      'Só evidências coletadas podem ser mostradas aos suspeitos ou usadas na acusação.',
    ],
  },
  {
    tag: 'Laboratório',
    title: 'Peça exames forenses',
    body: (
      <>
        Envie evidências para exame de <b>impressões digitais</b>, <b>DNA</b> ou <b>substâncias</b>. Cada exame leva cerca de 40 minutos do
        relógio do caso.
      </>
    ),
    tips: [
      'Enquanto o exame corre, continue investigando. Ou use "Aguardar laudo" para avançar o relógio até o resultado.',
      'Nem todo exame revela algo. Pense em qual teste faz sentido para cada objeto.',
    ],
    image: { kind: 'scene', id: 'monitoramento' },
  },
  {
    tag: 'Interrogatório',
    title: 'Converse com os suspeitos',
    body: (
      <>
        Escreva perguntas livremente: as respostas são geradas por IA a partir da ficha de cada personagem. Eles mentem sobre o que os
        compromete, até serem confrontados com provas.
      </>
    ),
    tips: [
      'Cada suspeito aceita até 15 perguntas, e cada uma custa 3 minutos.',
      'Mostrar evidência: apresente um item e veja a reação.',
      'Confrontar contradição: escolha algo que o suspeito afirmou e a evidência que desmente. Se acertar, ele recua e revela fatos novos.',
      'Observe o estado emocional (calmo, nervoso, defensivo, irritado, abalado).',
    ],
    image: { kind: 'portrait', id: 'joao' },
  },
  {
    tag: 'Quadro',
    title: 'Monte sua teoria',
    body: <>O Quadro investigativo organiza o que você descobriu. Arraste os itens, ou toque num item e depois no destino.</>,
    tips: [
      'Linha do tempo: encaixe cada evento descoberto no horário certo.',
      'Suspeitos e evidências: ligue provas a pessoas e marque o principal suspeito.',
      'Caderno: todos os fatos que você já descobriu, com a origem de cada um.',
    ],
  },
  {
    tag: 'Acusação',
    title: 'Feche o caso',
    body: (
      <>
        Escolha o culpado, o motivo, o método e até 3 evidências-chave. <b>Só há uma chance</b>: depois de confirmar, o caso é encerrado.
      </>
    ),
    tips: [
      'A nota (S, A, B, C ou D) avalia a investigação toda, não só o nome do culpado.',
      'Contam pontos: evidências encontradas, exames relevantes, contradições expostas, a linha do tempo correta e as provas apresentadas.',
      'No fim, você vê a reconstituição completa do crime.',
    ],
  },
];

export function Tutorial() {
  const { caseData, session, back, newGame, busy } = useGame();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((v) => Math.min(STEPS.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const img = step.image && caseData
    ? step.image.kind === 'scene'
      ? caseData.scenes.find((s) => s.id === step.image!.id)
      : caseData.characters.find((c) => c.id === step.image!.id)
    : undefined;
  const imgSrc = img ? ('image' in img ? img.image : img.portrait) : undefined;

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <button className="btn pl-2.5" onClick={back}>
          <IconBack />
          Voltar
        </button>
        <div>
          <p className="label">Manual do investigador</p>
          <h1 className="text-2xl font-black tracking-wide">Como jogar</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Índice */}
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Etapas do tutorial">
          {STEPS.map((s, n) => (
            <button
              key={s.tag}
              onClick={() => setI(n)}
              className={`flex shrink-0 items-baseline gap-3 rounded-[3px] border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                n === i ? 'border-clue bg-white/[0.05] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-mono text-[11px] text-slate-500">{String(n + 1).padStart(2, '0')}</span>
              {s.tag}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <article key={i} className="panel fade-up overflow-hidden">
          {img && imgSrc && (
            <div className="relative h-44 overflow-hidden border-b border-edge sm:h-56">
              <AssetImage
                src={imgSrc}
                alt=""
                kind={step.image!.kind}
                label={img.name}
                className={`absolute inset-0 h-full w-full ${step.image!.kind === 'portrait' ? 'object-[50%_25%]' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/30 to-transparent" />
            </div>
          )}
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <p className="label !text-clue">
                {String(i + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {step.tag}
              </p>
              <h2 className="mt-1 text-xl font-bold">{step.title}</h2>
            </div>
            <p className="text-[15px] leading-relaxed text-slate-200">{step.body}</p>
            <ul className="space-y-2 border-t border-edge pt-4 text-sm text-slate-300">
              {step.tips.map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-px w-3 shrink-0 bg-clue" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-edge px-5 py-3 sm:px-6">
            <button className="btn pl-2.5" disabled={i === 0} onClick={() => setI(i - 1)}>
              <IconBack />
              Anterior
            </button>
            {last ? (
              session && !session.finished ? (
                <button className="btn btn-primary" onClick={back}>
                  Voltar à investigação
                </button>
              ) : (
                <button className="btn btn-primary" disabled={busy || !caseData} onClick={newGame}>
                  Começar um caso
                </button>
              )
            ) : (
              <button className="btn btn-primary pr-2.5" onClick={() => setI(i + 1)}>
                Próximo
                <IconNext />
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
