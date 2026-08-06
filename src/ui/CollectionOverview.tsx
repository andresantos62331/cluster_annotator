import { useMemo } from "react";
import type { GroundTruth } from "../types";
import { LIXO, PALETTE } from "../colors";
import { Ring } from "./bits";

// Resumo da "Coleção": panorama do trabalho antes das fichas por espécie —
// progresso global, números-chave, distribuição por espécie e por família
// botânica (esta só possível por causa dos códigos EPPO). Tudo derivado do
// ground truth + vocabulário, em SVG/CSS simples (sem libs de gráficos).
export function CollectionOverview({
  labels,
  groundTruth,
  colorOf,
  familyOf,
  totalAll,
  onPick,
}: {
  labels: string[]; // inclui LIXO no fim (como o resto da vista)
  groundTruth: GroundTruth;
  colorOf: (l: string) => string;
  familyOf: (l: string) => string;
  totalAll: number;
  onPick: (label: string) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of Object.values(groundTruth)) c[v] = (c[v] ?? 0) + 1;
    return c;
  }, [groundTruth]);

  const speciesLabels = labels.filter((l) => l !== LIXO);
  const withImages = speciesLabels.filter((l) => (counts[l] ?? 0) > 0);
  const annotated = Object.keys(groundTruth).length;
  const lixoCount = counts[LIXO] ?? 0;
  const pct = totalAll ? (annotated / totalAll) * 100 : 0;

  // ranking de espécies por população (barras)
  const ranked = [...withImages].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const maxCount = counts[ranked[0]] ?? 1;
  const TOP = 14;
  const topSpecies = ranked.slice(0, TOP);
  const moreCount = ranked.length - topSpecies.length;

  // distribuição por família botânica (via EPPO)
  const families = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of withImages) {
      const fam = familyOf(l) || "Sem código EPPO";
      m.set(fam, (m.get(fam) ?? 0) + (counts[l] ?? 0));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [withImages, familyOf, counts]);
  const famTotal = families.reduce((s, [, v]) => s + v, 0);
  const famColor = (name: string, i: number) =>
    name === "Sem código EPPO" ? "#6b6253" : PALETTE[(i * 5) % PALETTE.length];

  // geometria do donut
  const R = 54, SW = 16, CX = 72, CY = 72, CIRC = 2 * Math.PI * R;
  let acc = 0;

  if (annotated === 0) {
    return (
      <div className="coll-overview empty">
        <div className="co-hero-ring">
          <Ring pct={0} size={64} stroke={6} />
        </div>
        <div>
          <h2 className="co-title">Coleção</h2>
          <p className="co-empty-sub">
            Ainda sem anotações. Começa a anotar no separador <b>Grupos</b> e o
            panorama da coleção aparece aqui: distribuição por espécie e por família.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="coll-overview">
      {/* hero: progresso global + números-chave */}
      <div className="co-hero">
        <div className="co-hero-ring">
          <Ring pct={pct} size={76} stroke={7} decimals={2} />
        </div>
        <div className="co-stats">
          <div className="co-stat">
            <span className="co-stat-n mono">{annotated.toLocaleString("pt-PT")}</span>
            <span className="co-stat-l">de {totalAll.toLocaleString("pt-PT")} plântulas anotadas</span>
          </div>
          <div className="co-stat">
            <span className="co-stat-n mono">{withImages.length}</span>
            <span className="co-stat-l">{withImages.length === 1 ? "espécie" : "espécies"} na coleção</span>
          </div>
          <div className="co-stat">
            <span className="co-stat-n mono">{families.filter(([f]) => f !== "Sem código EPPO").length}</span>
            <span className="co-stat-l">{families.length === 1 ? "família" : "famílias"} botânicas</span>
          </div>
          {lixoCount > 0 && (
            <div className="co-stat">
              <span className="co-stat-n mono" style={{ color: "var(--danger)" }}>{lixoCount}</span>
              <span className="co-stat-l">no lixo</span>
            </div>
          )}
        </div>
      </div>

      <div className="co-grid">
        {/* distribuição por espécie */}
        <section className="co-card">
          <h3 className="co-card-title">População por espécie</h3>
          <div className="co-bars">
            {topSpecies.map((l) => {
              const n = counts[l] ?? 0;
              return (
                <button key={l} className="co-bar-row" onClick={() => onPick(l)} title={`Ir para ${l}`}>
                  <span className="co-bar-name" style={{ color: colorOf(l) }}>{l}</span>
                  <span className="co-bar-track">
                    <span className="co-bar-fill" style={{ width: `${(n / maxCount) * 100}%`, background: colorOf(l) }} />
                  </span>
                  <span className="co-bar-n mono">{n}</span>
                </button>
              );
            })}
          </div>
          {moreCount > 0 && <div className="co-more">+ {moreCount} {moreCount === 1 ? "espécie" : "espécies"} abaixo</div>}
        </section>

        {/* distribuição por família (EPPO) */}
        <section className="co-card">
          <h3 className="co-card-title">Por família botânica</h3>
          <div className="co-donut-wrap">
            <svg width={CX * 2} height={CY * 2} viewBox={`0 0 ${CX * 2} ${CY * 2}`} className="co-donut">
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-soft)" strokeWidth={SW} />
              {families.map(([name, val], i) => {
                const len = famTotal ? (val / famTotal) * CIRC : 0;
                const seg = (
                  <circle
                    key={name}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={famColor(name, i)}
                    strokeWidth={SW}
                    strokeDasharray={`${len} ${CIRC - len}`}
                    strokeDashoffset={-acc}
                    transform={`rotate(-90 ${CX} ${CY})`}
                  />
                );
                acc += len;
                return seg;
              })}
              <text x={CX} y={CY - 4} className="co-donut-c1">{families.length}</text>
              <text x={CX} y={CY + 14} className="co-donut-c2">{families.length === 1 ? "família" : "famílias"}</text>
            </svg>
            <ul className="co-legend">
              {families.map(([name, val], i) => (
                <li key={name}>
                  <span className="co-leg-sw" style={{ background: famColor(name, i) }} />
                  <span className="co-leg-name">{name}</span>
                  <span className="co-leg-n mono">{val}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
