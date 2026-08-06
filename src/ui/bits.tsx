import { genColor, textOn } from "../colors";

// Badge de geração do recluster do ruído (G1, G2, ...). G0/inicial não mostra nada.
export function GenBadge({ gen }: { gen: number }) {
  if (!gen || gen <= 0) return null;
  const c = genColor(gen);
  return (
    <span
      title={`grupo recuperado do ruído, geração ${gen}`}
      style={{
        display: "inline-block",
        padding: "0 5px",
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        lineHeight: "15px",
        fontFamily: "var(--font-mono)",
        verticalAlign: "middle",
        background: c,
        color: textOn(c),
      }}
    >
      G{gen}
    </span>
  );
}

// Anel de progresso (SVG). pct 0..100.
export function Ring({
  pct,
  size = 44,
  stroke = 4,
  color = "var(--accent)",
  showLabel = true,
  decimals,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  showLabel?: boolean;
  // se definido, o rótulo mostra a percentagem com N casas decimais + "%"
  decimals?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  const done = pct >= 100;
  const labelText = done ? "✓" : decimals != null ? `${pct.toFixed(decimals)}%` : `${Math.round(pct)}`;
  const labelFactor = decimals != null ? 0.2 : 0.26;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "var(--leaf)" : color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s var(--ease), stroke 0.3s" }}
        />
      </svg>
      {showLabel && (
        <span className="ring-label" style={{ fontSize: size * labelFactor, color: done ? "var(--leaf)" : "var(--ink)" }}>
          {labelText}
        </span>
      )}
    </div>
  );
}

export function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="pagination">
      <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}>
        ← anterior
      </button>
      <span className="mono">
        página {page + 1} / {total}
      </span>
      <button onClick={() => onPage(Math.min(total - 1, page + 1))} disabled={page === total - 1}>
        seguinte →
      </button>
    </div>
  );
}

// Barra de progresso fina genérica.
export function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="clu-bar" style={{ height: 4 }}>
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
