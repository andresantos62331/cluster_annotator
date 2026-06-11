import { useEffect, useRef, useState } from "react";
import type { ClusterMetrics, GroundTruth } from "../types";
import { Card } from "./Card";
import { SpeciesThumb } from "./SpeciesThumb";
import { GenBadge, Pagination, Ring } from "./bits";

const IMAGES_PER_PAGE = 30;

export function Workspace({
  clusterId,
  metrics,
  clusterFilenames,
  unannotated,
  groundTruth,
  page,
  onPage,
  selection,
  showAnnotated,
  onToggleShowAnnotated,
  labels,
  activeSpecies,
  colorOf,
  thumbOf,
  onSetActive,
  onToggleSelect,
  onOpenLightbox,
  onAssign,
  onSelectPage,
  onSelectUnclassified,
  onToggleMany,
  onRetire,
  onClear,
  onSelectCluster,
  focusFile,
  onFocusHandled,
}: {
  clusterId: number;
  metrics: ClusterMetrics | null;
  clusterFilenames: string[];
  unannotated: string[];
  groundTruth: GroundTruth;
  page: number;
  onPage: (n: number) => void;
  selection: Set<string>;
  showAnnotated: boolean;
  onToggleShowAnnotated: (v: boolean) => void;
  labels: string[];
  activeSpecies: string;
  colorOf: (l: string) => string;
  thumbOf: (l: string) => string | null;
  onSetActive: (l: string) => void;
  onToggleSelect: (f: string) => void;
  onOpenLightbox: (f: string) => void;
  onAssign: () => void;
  onSelectPage: () => void;
  onSelectUnclassified: () => void;
  onToggleMany: (files: string[]) => void;
  onRetire: () => void;
  onClear: () => void;
  onSelectCluster: (cid: number) => void;
  focusFile: string | null;
  onFocusHandled: () => void;
}) {
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // chegada via "Ir para cluster de origem": scroll até à imagem e realça-a
  useEffect(() => {
    if (!focusFile) return;
    const el = bodyRef.current?.querySelector(
      `[data-file="${CSS.escape(focusFile)}"]`,
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const on = "0 0 0 4px rgba(255,106,61,1), 0 0 20px 4px rgba(255,106,61,0.8)";
      const dim = "0 0 0 4px rgba(255,106,61,0.25), 0 0 10px 1px rgba(255,106,61,0.15)";
      const off = "0 0 0 4px rgba(255,106,61,0), 0 0 0 0 rgba(255,106,61,0)";
      el.animate(
        [
          { boxShadow: off, offset: 0 },
          { boxShadow: on, offset: 0.06 },
          { boxShadow: dim, offset: 0.18 },
          { boxShadow: on, offset: 0.3 },
          { boxShadow: dim, offset: 0.42 },
          { boxShadow: on, offset: 0.54 },
          { boxShadow: dim, offset: 0.66 },
          { boxShadow: on, offset: 0.78 },
          { boxShadow: off, offset: 1 },
        ],
        { duration: 4400, easing: "ease-out" },
      );
    }
    onFocusHandled();
  }, [focusFile, onFocusHandled]);

  useEffect(() => {
    if (!ddOpen) return;
    const h = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [ddOpen]);

  const isNoise = clusterId === -1;
  const total = clusterFilenames.length;
  const annotated = total - unannotated.length;
  const pct = total ? (annotated / total) * 100 : 0;

  const totalPages = Math.max(1, Math.ceil(unannotated.length / IMAGES_PER_PAGE));
  const effPage = Math.min(page, totalPages - 1);
  const pageFiles = unannotated.slice(effPage * IMAGES_PER_PAGE, (effPage + 1) * IMAGES_PER_PAGE);

  // anotadas deste cluster agrupadas por espécie (contagem desc)
  const groups: [string, string[]][] = [];
  {
    const by: Record<string, string[]> = {};
    for (const f of clusterFilenames) {
      const lb = groundTruth[f];
      if (lb) (by[lb] ??= []).push(f);
    }
    groups.push(...Object.entries(by).sort((a, b) => b[1].length - a[1].length));
  }

  const pageAllSelected = pageFiles.length > 0 && pageFiles.every((f) => selection.has(f));
  const allUnclassSelected = unannotated.length > 0 && unannotated.every((f) => selection.has(f));
  // quantas das selecionadas já têm etiqueta (alvo do "Retirar etiqueta")
  let labeledInSel = 0;
  for (const f of selection) if (groundTruth[f]) labeledInSel++;

  return (
    <div className="work-body" ref={bodyRef}>
      <header className={`clu-header ${isNoise ? "noise" : ""}`}>
        <div className="ch-title">
          <h1>{isNoise ? "Ruído" : `Cluster ${clusterId}`}</h1>
          {!isNoise && <GenBadge gen={metrics?.origem ?? 0} />}
          <div className="ch-ring">
            <Ring pct={pct} size={52} stroke={5} />
          </div>
        </div>
        <div className="metric-chips">
          <span className="chip k-size">
            <span className="chip-k">tamanho</span> <b>{total}</b>
          </span>
          <span className="chip k-done">
            <span className="chip-k">anotadas</span> <b>{annotated}</b>
          </span>
          <span className="chip k-todo">
            <span className="chip-k">por anotar</span> <b>{unannotated.length}</b>
          </span>
          {metrics && metrics.cohesion_mean != null && (
            <>
              <span className="chip k-metric" title="coesão média — quão apertado é o grupo">
                <span className="chip-k">coesão</span> <b>{metrics.cohesion_mean.toFixed(3)}</b>
              </span>
              <span className="chip k-metric" title="separação — distância ao grupo vizinho">
                <span className="chip-k">separação</span> <b>{metrics.separation?.toFixed(3) ?? "—"}</b>
              </span>
              <span className="chip k-metric" title="persistência (estabilidade HDBSCAN)">
                <span className="chip-k">persist.</span> <b>{metrics.persistence?.toFixed(3) ?? "—"}</b>
              </span>
              {metrics.nearest_cluster != null && (
                <button
                  type="button"
                  className="chip k-metric chip-link"
                  title={`ir para o grupo mais parecido — c${metrics.nearest_cluster}`}
                  onClick={() => onSelectCluster(metrics.nearest_cluster!)}
                >
                  <span className="chip-k">vizinho</span> <b>c{metrics.nearest_cluster}</b>
                  <span className="chip-go">→</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="action-bar">
        <div ref={ddRef} style={{ position: "relative" }}>
          <div
            className={`active-species ${activeSpecies ? "" : "empty"}`}
            onClick={() => setDdOpen((v) => !v)}
            title="Espécie a atribuir"
          >
            {activeSpecies ? (
              <>
                <SpeciesThumb file={thumbOf(activeSpecies)} color={colorOf(activeSpecies)} size={22} />
                <span className="as-name">{activeSpecies}</span>
              </>
            ) : (
              <span className="as-name">— escolher espécie —</span>
            )}
            <span className="as-caret">▾</span>
          </div>
          {ddOpen && (
            <div className="sp-dropdown">
              {labels.length === 0 && <div className="dd-empty">Cria espécies no painel da direita.</div>}
              {labels.map((l, i) => (
                <button
                  key={l}
                  onClick={() => {
                    onSetActive(l);
                    setDdOpen(false);
                  }}
                >
                  <SpeciesThumb file={thumbOf(l)} color={colorOf(l)} size={20} />
                  {l}
                  {i < 9 && <span className="dd-key">{i + 1}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn assign"
          onClick={onAssign}
          disabled={!activeSpecies || selection.size === 0}
          title="Atribuir a espécie ativa (tecla A)"
        >
          Atribuir a {selection.size} <span className="kbd">A</span>
        </button>

        {/* selecionar — toggles com estado (✓), não renomeiam para "Limpar" */}
        <div className="select-tools" role="group" aria-label="Selecionar">
          <button
            className={`seltool ${allUnclassSelected ? "on" : ""}`}
            onClick={onSelectUnclassified}
            disabled={unannotated.length === 0}
            title="Selecionar todas as imagens por classificar"
          >
            <span className="seltool-box">{allUnclassSelected ? "✓" : ""}</span>
            Por classificar
          </button>
          <button
            className={`seltool ${pageAllSelected ? "on" : ""}`}
            onClick={onSelectPage}
            disabled={pageFiles.length === 0}
            title="Selecionar só esta página"
          >
            <span className="seltool-box">{pageAllSelected ? "✓" : ""}</span>
            Página
          </button>
        </div>

        {/* acções sobre a selecção — só aparecem quando há selecção */}
        {labeledInSel > 0 && (
          <button className="btn warn" onClick={onRetire} title="Retirar etiqueta às anotadas selecionadas (tecla R)">
            Retirar etiqueta {labeledInSel} <span className="kbd">R</span>
          </button>
        )}
        {selection.size > 0 && (
          <button className="btn danger" onClick={onClear} title="Limpar selecção (tecla D)">
            Limpar <span className="kbd">D</span>
          </button>
        )}

        <label className="toggle">
          <input type="checkbox" checked={showAnnotated} onChange={(e) => onToggleShowAnnotated(e.target.checked)} />
          <span className="tk" />
          Mostrar anotadas
        </label>

        <div className="spacer" />
        <div className={`sel-count ${selection.size ? "has" : ""}`}>{selection.size} selecionada(s)</div>
      </div>

      {/* Por classificar */}
      <div className="section-head">
        <span className="sh-bar" />
        <span className="sh-title">Por classificar</span>
        <span className="sh-count mono">{unannotated.length}</span>
      </div>

      {unannotated.length === 0 ? (
        <div className={`empty-state done`}>
          <div className="es-icon">{total === 0 ? "○" : "✓"}</div>
          <div className="es-title">{total === 0 ? "Grupo vazio" : "Tudo anotado neste grupo"}</div>
          <div className="es-sub">
            {total === 0 ? "Não há imagens aqui." : "Bom trabalho — salta para o próximo com J."}
          </div>
        </div>
      ) : (
        <>
          {totalPages > 1 && <Pagination page={effPage} total={totalPages} onPage={onPage} />}
          <div className="grid">
            {pageFiles.map((f, i) => (
              <Card
                key={f}
                filename={f}
                index={i}
                selected={selection.has(f)}
                onToggle={() => onToggleSelect(f)}
                onOpen={() => onOpenLightbox(f)}
              />
            ))}
          </div>
          {totalPages > 1 && <Pagination page={effPage} total={totalPages} onPage={onPage} />}
        </>
      )}

      {/* Anotadas por espécie */}
      {showAnnotated &&
        groups.map(([sp, files]) => {
          const groupAllSel = files.length > 0 && files.every((f) => selection.has(f));
          return (
          <div className="species-group" key={sp}>
            <div className="section-head">
              <span className="sw" style={{ background: colorOf(sp) }} />
              <span className="sh-title" style={{ color: colorOf(sp) }}>
                {sp}
              </span>
              <button
                className={`group-sel ${groupAllSel ? "on" : ""}`}
                onClick={() => onToggleMany(files)}
                title="Selecionar estas para reatribuir ou retirar etiqueta"
              >
                <span className="seltool-box">{groupAllSel ? "✓" : ""}</span>
                selecionar
              </button>
              <span className="sh-count mono">{files.length}</span>
            </div>
            <div className="grid">
              {files.map((f, i) => (
                <Card
                  key={f}
                  filename={f}
                  index={i}
                  selected={selection.has(f)}
                  label={sp}
                  color={colorOf(sp)}
                  onToggle={() => onToggleSelect(f)}
                  onOpen={() => onOpenLightbox(f)}
                />
              ))}
            </div>
          </div>
          );
        })}
    </div>
  );
}
