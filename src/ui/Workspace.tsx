import { useEffect, useRef, useState } from "react";
import type { ClusterMetrics, GroundTruth } from "../types";
import { LIXO, tint } from "../colors";
import { Card } from "./Card";
import { SpeciesThumb } from "./SpeciesThumb";
import { GenBadge, Pagination, Ring } from "./bits";
import { IconTrash } from "./icons";

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
  flying,
  showAnnotated,
  onToggleShowAnnotated,
  labels,
  activeSpecies,
  colorOf,
  thumbOf,
  eppoOf,
  onSetActive,
  onToggleSelect,
  onOpenLightbox,
  onAssign,
  onSelectPage,
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
  flying: Set<string>;
  showAnnotated: boolean;
  onToggleShowAnnotated: (v: boolean) => void;
  labels: string[];
  activeSpecies: string;
  colorOf: (l: string) => string;
  thumbOf: (l: string) => string | null;
  eppoOf: (l: string) => string;
  onSetActive: (l: string) => void;
  onToggleSelect: (f: string) => void;
  // segundo argumento = secção de onde se abriu; define a ordem do ←/→ no viewport
  onOpenLightbox: (f: string, scope: string[]) => void;
  onAssign: () => void;
  onSelectPage: () => void;
  onToggleMany: (files: string[]) => void;
  onRetire: () => void;
  onClear: () => void;
  onSelectCluster: (cid: number) => void;
  focusFile: string | null;
  onFocusHandled: () => void;
}) {
  const [ddOpen, setDdOpen] = useState(false);
  // fichas de espécie colapsadas (concordante com a tab Espécies)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const ddRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // chegada via "Ir para cluster de origem": scroll até à imagem e realça-a
  // com a COR DA ESPÉCIE dessa imagem (fallback: vermelhão de acento)
  useEffect(() => {
    if (!focusFile) return;
    const el = bodyRef.current?.querySelector(
      `[data-file="${CSS.escape(focusFile)}"]`,
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const label = groundTruth[focusFile];
      const hex = label ? colorOf(label) : "#ff6a3d";
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
      const rgb = m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : "255,106,61";
      const on = `0 0 0 4px rgba(${rgb},1), 0 0 20px 4px rgba(${rgb},0.8)`;
      const dim = `0 0 0 4px rgba(${rgb},0.25), 0 0 10px 1px rgba(${rgb},0.15)`;
      const off = `0 0 0 4px rgba(${rgb},0), 0 0 0 0 rgba(${rgb},0)`;
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
  }, [focusFile, onFocusHandled, groundTruth, colorOf]);

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

  // anotadas deste cluster agrupadas por espécie (contagem desc). O Lixo NÃO é
  // uma espécie — sai dos grupos e vai para uma secção própria (caixote) no fim.
  const groups: [string, string[]][] = [];
  let lixoFiles: string[] = [];
  {
    const by: Record<string, string[]> = {};
    for (const f of clusterFilenames) {
      const lb = groundTruth[f];
      if (lb) (by[lb] ??= []).push(f);
    }
    lixoFiles = by[LIXO] ?? [];
    delete by[LIXO];
    groups.push(...Object.entries(by).sort((a, b) => b[1].length - a[1].length));
  }
  const lixoAllSel = lixoFiles.length > 0 && lixoFiles.every((f) => selection.has(f));

  const pageAllSelected = pageFiles.length > 0 && pageFiles.every((f) => selection.has(f));
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
            {activeSpecies === LIXO ? (
              <>
                <span className="sp-lixo-icon" style={{ color: "var(--danger)", display: "grid", placeItems: "center" }}>
                  <IconTrash size={15} />
                </span>
                <span className="as-name" style={{ color: "var(--danger)" }}>{LIXO}</span>
              </>
            ) : activeSpecies ? (
              <>
                <SpeciesThumb file={thumbOf(activeSpecies)} size={22} />
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
              {/* ordem ALFABÉTICA — procura-se pelo nome. SEM as teclas 1-9: aqui a
                  ordem já não é a delas (essa é a do painel direito, onde ficam). */}
              {[...labels]
                .sort((a, b) => a.localeCompare(b, "pt"))
                .map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    onSetActive(l);
                    setDdOpen(false);
                  }}
                >
                  <SpeciesThumb file={thumbOf(l)} size={22} />
                  <span className="dd-name">{l}</span>
                  {eppoOf(l) && <span className="eppo-chip has mono">{eppoOf(l)}</span>}
                  <span className="sw" style={{ background: colorOf(l) }} />
                </button>
              ))}
              {/* categoria reservada, sempre disponível no fim */}
              <div className="dd-sep" />
              <button
                onClick={() => {
                  onSetActive(LIXO);
                  setDdOpen(false);
                }}
              >
                <span className="sp-lixo-icon" style={{ color: "var(--danger)", display: "grid", placeItems: "center" }}>
                  <IconTrash size={15} />
                </span>
                <span className="dd-name" style={{ color: "var(--danger)" }}>{LIXO}</span>
              </button>
            </div>
          )}
        </div>

        <button
          className="btn assign"
          onClick={onAssign}
          disabled={!activeSpecies || selection.size === 0}
          title="Atribuir a espécie ativa (tecla A)"
        >
          Atribuir a {selection.size} selecionada{selection.size === 1 ? "" : "s"} <span className="kbd">A</span>
        </button>

        {/* acções sobre a selecção — só aparecem quando há selecção */}
        {labeledInSel > 0 && (
          <button className="btn warn" onClick={onRetire} title="Retirar etiqueta às anotadas selecionadas (tecla R)">
            Retirar etiqueta {labeledInSel} <span className="kbd">R</span>
          </button>
        )}
        {selection.size > 0 && (
          <button className="btn" onClick={onClear} title="Desselecionar tudo (Esc ou D)">
            Desselecionar <span className="kbd">Esc</span>
          </button>
        )}

        <div className="spacer" />
        <label className="toggle">
          <input type="checkbox" checked={showAnnotated} onChange={(e) => onToggleShowAnnotated(e.target.checked)} />
          <span className="tk" />
          Mostrar anotadas
        </label>
      </div>

      {/* Por classificar */}
      <div className="section-head">
        <span className="sh-bar" />
        <span className="sh-title">Por classificar</span>
        <span className="sh-count mono">{unannotated.length}</span>
        {pageFiles.length > 0 && (
          <button
            className={`svb-check sh-check ${pageAllSelected ? "on" : ""}`}
            onClick={onSelectPage}
            title={pageAllSelected ? "Desselecionar a página visível" : "Selecionar toda a página visível"}
          >
            <svg viewBox="0 0 24 24" width="13" height="13">
              <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
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
          <div className="grid">
            {pageFiles.map((f, i) => (
              <Card
                key={f}
                filename={f}
                index={i}
                selected={selection.has(f)}
                hidden={flying.has(f)}
                onToggle={() => onToggleSelect(f)}
                // ←/→ percorre TODAS as por classificar (atravessa páginas), não o cluster inteiro
                onOpen={() => onOpenLightbox(f, unannotated)}
              />
            ))}
          </div>
          {totalPages > 1 && <Pagination page={effPage} total={totalPages} onPage={onPage} />}
        </>
      )}

      {/* Anotadas por espécie — ficha "de herbário" sticky, concordante com a tab
          Espécies (faixa de cor, colapsar ao clicar). Sem histograma: dentro de um
          só cluster os "clusters de origem" não fazem sentido. */}
      {showAnnotated && groups.length > 0 && (
        <div className="section-head">
          <span className="sh-bar" />
          <span className="sh-title">Espécies presentes neste cluster</span>
          <span className="sh-count mono">{groups.length}</span>
        </div>
      )}
      {showAnnotated &&
        groups.map(([sp, files]) => {
          const groupAllSel = files.length > 0 && files.every((f) => selection.has(f));
          const isCollapsed = collapsed.has(sp);
          const col = colorOf(sp);
          const toggleFold = () =>
            setCollapsed((prev) => {
              const next = new Set(prev);
              if (next.has(sp)) next.delete(sp);
              else next.add(sp);
              return next;
            });
          return (
          <div className="species-view-block species-group" key={sp}>
            <div
              className="svb-head svb-head-click"
              style={{ background: `linear-gradient(90deg, ${tint(col, 0.13)}, rgba(0,0,0,0) 75%), var(--bg)` }}
              onClick={toggleFold}
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              <span className="svb-fold" aria-hidden>
                {isCollapsed ? "▸" : "▾"}
              </span>
              <button
                className={`svb-check ${groupAllSel ? "on" : ""}`}
                title={groupAllSel ? "Desselecionar estas" : "Selecionar estas para reatribuir ou retirar etiqueta"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMany(files);
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13">
                  <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="sw" style={{ background: col }} />
              <h3>
                <span className="svb-name" style={{ color: col }}>{sp}</span>
                {eppoOf(sp) && (
                  <span className="eppo-chip has mono" title={`Código EPPO: ${eppoOf(sp)}`}>
                    {eppoOf(sp)}
                  </span>
                )}
                <span className="svb-pop">
                  {files.length} {files.length === 1 ? "imagem" : "imagens"}
                </span>
              </h3>
            </div>
            {!isCollapsed && (
              <div className="grid">
                {files.map((f, i) => (
                  <Card
                    key={f}
                    filename={f}
                    index={i}
                    selected={selection.has(f)}
                    label={sp}
                    color={col}
                    onToggle={() => onToggleSelect(f)}
                    onOpen={() => onOpenLightbox(f, files)}
                  />
                ))}
              </div>
            )}
          </div>
          );
        })}

      {/* Lixo — secção própria, NÃO é uma espécie: caixote distinto no fim */}
      {showAnnotated && lixoFiles.length > 0 && (
        <div className="lixo-bin">
          <div className="lixo-head">
            <button
              className={`svb-check ${lixoAllSel ? "on" : ""}`}
              title={lixoAllSel ? "Desselecionar" : "Selecionar tudo no lixo"}
              onClick={() => onToggleMany(lixoFiles)}
            >
              <svg viewBox="0 0 24 24" width="13" height="13">
                <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="lixo-mark"><IconTrash size={18} /></span>
            <span className="lixo-title">{LIXO}</span>
            <span className="lixo-note">
              {lixoFiles.length} {lixoFiles.length === 1 ? "crop inutilizável" : "crops inutilizáveis"}
            </span>
          </div>
          <div className="grid">
            {lixoFiles.map((f, i) => (
              <Card
                key={f}
                filename={f}
                index={i}
                selected={selection.has(f)}
                onToggle={() => onToggleSelect(f)}
                onOpen={() => onOpenLightbox(f, lixoFiles)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
