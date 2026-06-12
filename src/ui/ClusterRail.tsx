import { useMemo, useRef, useState } from "react";
import type { ConfigData, GroundTruth } from "../types";
import { GenBadge } from "./bits";
import { IconSearch } from "./icons";

const baseUrl = import.meta.env.BASE_URL || "/";
const PREVIEW = 168; // lado do popover de pré-visualização (como no SpeciesThumb)

type Mode = "todos" | "fazer" | "feitos";

// Miniatura do grupo (representante mais perto do centroide) com pré-visualização
// grande no hover — mesmo comportamento das miniaturas de espécie (popover com
// posição fixa, à direita do rail, ~130ms de atraso).
function RailThumb({ file }: { file: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 10;
    let left = r.right + gap;
    if (left + PREVIEW > window.innerWidth - 8) left = r.left - PREVIEW - gap;
    left = Math.max(8, left);
    let top = r.top + r.height / 2 - PREVIEW / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - PREVIEW - 8));
    setPos({ top, left });
  };

  return (
    <span
      ref={ref}
      className="clu-thumb-wrap"
      onMouseEnter={() => { timer.current = window.setTimeout(show, 130); }}
      onMouseLeave={() => { window.clearTimeout(timer.current); setPos(null); }}
    >
      <img className="clu-thumb" loading="lazy" src={`${baseUrl}crops/${file}`} alt="" draggable={false} />
      {pos && (
        <span className="sp-preview" style={{ top: pos.top, left: pos.left }}>
          <img src={`${baseUrl}crops/${file}`} alt="" draggable={false} />
        </span>
      )}
    </span>
  );
}

export function ClusterRail({
  config,
  groundTruth,
  currentClusterId,
  onSelect,
}: {
  config: ConfigData;
  groundTruth: GroundTruth;
  currentClusterId: number | null;
  onSelect: (cid: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("todos");

  const items = useMemo(() => {
    const q = query.trim();
    return config.clusterIds
      .map((cid) => {
        const files = config.byCluster.get(cid) ?? [];
        const annotated = files.filter((f) => groundTruth[f]).length;
        const total = files.length;
        const gen = cid === -1 ? -1 : config.metrics.get(cid)?.origem ?? 0;
        return { cid, files, annotated, total, gen, done: total > 0 && annotated === total };
      })
      .filter((it) => {
        if (q && !(it.cid === -1 ? "ruido -1 ruído" : `c${it.cid} ${it.cid}`).includes(q)) return false;
        if (mode === "fazer" && it.done) return false;
        if (mode === "feitos" && !it.done) return false;
        return true;
      });
  }, [config, groundTruth, query, mode]);

  const genLabel = (gen: number): string => {
    if (gen === -1) return "Ruído — não agrupado";
    if (gen === 0) return "Inicial";
    return `Geração ${gen} · recuperado do ruído`;
  };

  let lastGen: number | null = null;

  return (
    <aside className="rail">
      <div className="rail-head">
        <div className="rh-title">
          <h2>Grupos</h2>
          <span className="rh-n mono">{items.length}</span>
        </div>
        <div className="search">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="procurar grupo (ex.: c217)…"
            spellCheck={false}
          />
        </div>
        <div className="filter-seg">
          {(["todos", "fazer", "feitos"] as Mode[]).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              {m === "todos" ? "Todos" : m === "fazer" ? "Por fazer" : "Concluídos"}
            </button>
          ))}
        </div>
      </div>

      <div className="rail-list">
        {items.length === 0 && <div className="rail-empty">Nenhum grupo corresponde.</div>}
        {items.map((it) => {
          const pct = it.total ? (it.annotated / it.total) * 100 : 0;
          const isNoise = it.cid === -1;
          const showDivider = it.gen !== lastGen;
          lastGen = it.gen;
          return (
            <div key={it.cid}>
              {showDivider && (
                <div className="gen-divider">
                  <span className="gd-text">{genLabel(it.gen)}</span>
                  <span className="gd-line" />
                </div>
              )}
              <div
                className={`clu ${isNoise ? "noise" : ""} ${it.cid === currentClusterId ? "active" : ""} ${it.done ? "done" : ""}`}
                onClick={() => onSelect(it.cid)}
              >
                {isNoise ? (
                  <div className="clu-thumb">✦</div>
                ) : (
                  <RailThumb file={config.reps.get(it.cid) ?? it.files[0]} />
                )}
                <div className="clu-body">
                  <div className="clu-line1">
                    <span className="clu-name">{isNoise ? "ruído" : `c${it.cid}`}</span>
                    {!isNoise && it.gen > 0 && <GenBadge gen={it.gen} />}
                    {it.done && <span className="clu-check">✓</span>}
                    <span className="clu-count">
                      {it.annotated}/{it.total}
                    </span>
                  </div>
                  <div className="clu-bar">
                    {/* cor acompanha o progresso: branco a 0% -> verde a 100% */}
                    <div
                      style={{
                        width: `${pct}%`,
                        background: `color-mix(in srgb, var(--leaf) ${Math.round(pct)}%, #fff)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
