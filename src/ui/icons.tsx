// Ícones SVG inline (stroke), leves e coerentes com o tema. 1.6 de espessura.
type P = { size?: number };
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconSearch = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

// "A confirmar": interrogação em círculo — dúvida, não erro (o Lixo é que é erro)
export const IconHelp = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.4 9a2.6 2.6 0 0 1 5 1c0 1.7-2.4 2-2.4 3.4" />
    <path d="M12 17.2h.01" />
  </svg>
);

export const IconCloud = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 9.5 4 4 0 0 0 7 17.5" />
    <path d="M12 12v7m0-7-2.5 2.5M12 12l2.5 2.5" />
  </svg>
);

export const IconDownload = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M5 21h14" />
  </svg>
);

export const IconUpload = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
    <path d="M5 20h14" />
  </svg>
);

export const IconJson = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M9 4H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h2" />
    <path d="M15 4h2a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-2" />
  </svg>
);

export const IconTable = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 4v16" />
  </svg>
);

export const IconChevron = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconLeaf = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 11-5 16-9 16Z" />
    <path d="M11 20c0-5 2-8 6-11" />
  </svg>
);

export const IconPencil = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconTrash = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h16" />
    <path d="M10 4h4M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

// sino das novidades. Sem arcos `a` na campânula: com a corda igual ao diâmetro
// o arco fica ambíguo e o desenho fechava numa bola. Curvas cúbicas, e o traço
// todo dentro de x 5..19 / y 4..20 para respirar dentro do botão redondo de 22px.
export const IconBell = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M12 4.2c-2.8 0-5 2.3-5 5.1 0 3.4-.7 4.8-1.5 5.8-.4.5 0 1.2.6 1.2h11.8c.6 0 1-.7.6-1.2-.8-1-1.5-2.4-1.5-5.8 0-2.8-2.2-5.1-5-5.1Z" />
    <path d="M10.3 18.6c.3.6.9 1 1.7 1s1.4-.4 1.7-1" />
  </svg>
);

export const IconLocate = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3.2M12 18.8V22M2 12h3.2M18.8 12H22" />
  </svg>
);
