import type { CSSProperties } from "react";
import type { ConfigData, GroundTruth } from "../types";
import { A_CONFIRMAR, CID_LIXO, isPilha, LIXO } from "../colors";
import { IconHelp, IconTrash } from "./icons";

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
          // As pilhas também são visitáveis, mas não são grupos: "c-2" e "c-3"
          // eram ids internos a escapar para a interface. Aqui valem pelo símbolo.
          if (isPilha(cid)) {
            const ehLixo = cid === CID_LIXO;
            const nome = ehLixo ? LIXO : A_CONFIRMAR;
            return (
              <button
                key={cid}
                type="button"
                className={`hist-chip hist-pilha ${ehLixo ? "hp-lixo" : "hp-confirmar"} ${
                  cid === currentClusterId ? "active" : ""
                }`}
                onClick={() => onSelect(cid)}
                title={nome}
                aria-label={nome}
              >
                {ehLixo ? <IconTrash size={13} /> : <IconHelp size={13} />}
              </button>
            );
          }
          const files = config.byCluster.get(cid) ?? [];
          const annotated = files.filter((f) => groundTruth[f]).length;
          const done = files.length > 0 && annotated === files.length;
          const active = cid === currentClusterId;
          // preenchimento do chip = progresso de anotação do grupo (via --p no CSS)
          const pct = files.length ? (annotated / files.length) * 100 : 0;
          return (
            <button
              key={cid}
              type="button"
              className={`hist-chip ${isNoise ? "noise" : ""} ${done ? "done" : ""} ${active ? "active" : ""}`}
              style={{ "--p": `${pct.toFixed(1)}%` } as CSSProperties}
              onClick={() => onSelect(cid)}
              title={
                isNoise
                  ? `ruído: ${annotated}/${files.length} anotadas (${Math.round(pct)}%)`
                  : `c${cid}: ${annotated}/${files.length} anotadas (${Math.round(pct)}%)`
              }
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
