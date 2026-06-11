import type { ConfigData, GroundTruth } from "../types";

// Pilha horizontal dos grupos visitados (mais recente à esquerda). Todos clicáveis
// — atalho para saltar de volta a um grupo já visto sem o procurar na lista.
export function ClusterHistory({
  visited,
  config,
  groundTruth,
  currentClusterId,
  onSelect,
}: {
  visited: number[];
  config: ConfigData;
  groundTruth: GroundTruth;
  currentClusterId: number | null;
  onSelect: (cid: number) => void;
}) {
  if (visited.length === 0) return null;

  return (
    <div className="clu-history" aria-label="Grupos visitados">
      <span className="hist-label">visitados</span>
      <div className="hist-track">
        {visited.map((cid) => {
          const isNoise = cid === -1;
          const files = config.byCluster.get(cid) ?? [];
          const annotated = files.filter((f) => groundTruth[f]).length;
          const done = files.length > 0 && annotated === files.length;
          const active = cid === currentClusterId;
          return (
            <button
              key={cid}
              type="button"
              className={`hist-chip ${isNoise ? "noise" : ""} ${done ? "done" : ""} ${active ? "active" : ""}`}
              onClick={() => onSelect(cid)}
              title={isNoise ? "ruído" : `c${cid} — ${annotated}/${files.length} anotadas`}
            >
              {isNoise ? "✦" : `c${cid}`}
              {done && !active && <span className="hc-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
