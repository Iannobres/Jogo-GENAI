// Ícones de traço simples (sem emoji). Herdam a cor do texto.
type P = { className?: string };

const base = (className = 'h-4 w-4') => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconClose = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconBack = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const IconNext = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const IconMenu = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconHelp = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" />
  </svg>
);

export const IconExit = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
  </svg>
);
