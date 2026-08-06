import { useEffect, useRef, useState } from "react";
import type { ClusterMetrics, GroundTruth } from "../types";
import { A_CONFIRMAR, CID_CONFIRMAR, CID_LIXO, isPilha, LIXO, tint } from "../colors";
import { Card } from "./Card";
import { SpeciesThumb } from "./SpeciesThumb";
import { GenBadge, Pagination, Ring } from "./bits";
import { useDragSelect } from "./dragSelect";
import { IconHelp, IconRank, IconTrash } from "./icons";

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
  rankOf,
  onSetActive,
  onToggleSelect,
  onPaintSelect,
  onOpenLightbox,
  onAssign,
  onSelectPage,
  onToggleMany,
  onRetire,
  onClear,
  onSelectCluster,
  onGoToOrigem,
  clusterOf,
  focusFiles,
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
  rankOf: (l: string) => string;
  onSetActive: (l: string) => void;
  onToggleSelect: (f: string) => void;
  // arrastamento: força o estado (não alterna) nos cartões por onde passa
  onPaintSelect: (files: string[], on: boolean) => void;
  // segundo argumento = secção de onde se abriu; define a ordem do ←/→ no viewport
  onOpenLightbox: (f: string, scope: string[]) => void;
  onAssign: () => void;
  onSelectPage: () => void;
  onToggleMany: (files: string[]) => void;
  onRetire: () => void;
  onClear: () => void;
  onSelectCluster: (cid: number) => void;
  // ir para o grupo de origem A ASSINALAR estas imagens quando lá chegar
  onGoToOrigem: (cid: number, files: string[]) => void;
  // cluster de origem de cada ficheiro — nas pilhas é o que dá a arrumação
  clusterOf: (f: string) => number | null;
  /** imagens a enquadrar e assinalar à chegada (uma, ou o bloco todo) */
  focusFiles: string[] | null;
  onFocusHandled: () => void;
}) {
  const [ddOpen, setDdOpen] = useState(false);
  // fichas de espécie colapsadas (concordante com a tab Espécies)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // o caixote arranca RECOLHIDO: é material de consulta ("terei exagerado a
  // deitar fora neste grupo?"), não trabalho, e estava a fazer de muro no fim
  // de cada cluster
  const [lixoOpen, setLixoOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // arrastar sobre a grelha seleciona em série. Registado no corpo inteiro (e não
  // grelha a grelha): vale para as "por classificar", para os grupos de espécie,
  // para o "A confirmar" e para o Lixo sem repetir código.
  const onDragSelect = useDragSelect({
    isSelected: (f) => selection.has(f),
    apply: onPaintSelect,
  });

  // Chegada via "ir para o grupo de origem": enquadra e faz ping nas imagens de
  // que se vinha a falar. Pode ser UMA (vinda da Coleção) ou o BLOCO TODO (vinda
  // de uma pilha) — sem isto, cair num grupo de 30 imagens não diz quais eram.
  useEffect(() => {
    if (!focusFiles || focusFiles.length === 0) return;
    // As imagens podem estar escondidas no sítio para onde vamos: o caixote
    // arranca recolhido e as fichas de espécie podem estar colapsadas. Abrir
    // primeiro, senão o ping seria num elemento que não existe no DOM.
    if (focusFiles.some((f) => groundTruth[f] === LIXO)) setLixoOpen(true);
    setCollapsed((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      for (const f of focusFiles) {
        const l = groundTruth[f];
        if (l) next.delete(l);
      }
      return next.size === prev.size ? prev : next;
    });

    const t = window.setTimeout(() => {
      let primeiro: HTMLElement | null = null;
      for (const f of focusFiles) {
        const el = bodyRef.current?.querySelector(
          `[data-file="${CSS.escape(f)}"]`,
        ) as HTMLElement | null;
        if (!el) continue;
        if (!primeiro) primeiro = el;
        const label = groundTruth[f];
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
      primeiro?.scrollIntoView({ behavior: "smooth", block: "center" });
      onFocusHandled();
    }, 70);
    return () => window.clearTimeout(t);
  }, [focusFiles, onFocusHandled, groundTruth, colorOf]);

  useEffect(() => {
    if (!ddOpen) return;
    const h = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [ddOpen]);

  const pilha = isPilha(clusterId);
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
  let confirmarFiles: string[] = [];
  {
    const by: Record<string, string[]> = {};
    for (const f of clusterFilenames) {
      const lb = groundTruth[f];
      if (lb) (by[lb] ??= []).push(f);
    }
    lixoFiles = by[LIXO] ?? [];
    confirmarFiles = by[A_CONFIRMAR] ?? [];
    delete by[LIXO];
    delete by[A_CONFIRMAR];
    groups.push(...Object.entries(by).sort((a, b) => b[1].length - a[1].length));
  }
  const lixoAllSel = lixoFiles.length > 0 && lixoFiles.every((f) => selection.has(f));
  const confirmarAllSel =
    confirmarFiles.length > 0 && confirmarFiles.every((f) => selection.has(f));

  const pageAllSelected = pageFiles.length > 0 && pageFiles.every((f) => selection.has(f));
  // quantas das selecionadas já têm etiqueta (alvo do "Retirar etiqueta")
  let labeledInSel = 0;
  for (const f of selection) if (groundTruth[f]) labeledInSel++;

  // Nas pilhas a grelha é arrumada pelo CLUSTER DE ORIGEM. Não é organização por
  // organização: plântulas que vieram do mesmo grupo são provavelmente a mesma
  // espécie, por isso resolver uma resolve o bloco todo — o clustering continua a
  // trabalhar mesmo dentro da pilha de dúvidas.
  const porOrigem: [number, string[]][] = [];
  if (pilha) {
    const by = new Map<number, string[]>();
    for (const f of pageFiles) {
      const c = clusterOf(f) ?? -1;
      const arr = by.get(c);
      if (arr) arr.push(f);
      else by.set(c, [f]);
    }
    porOrigem.push(...[...by.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0]));
  }
  const nOrigens = pilha ? new Set(clusterFilenames.map((f) => clusterOf(f) ?? -1)).size : 0;
  const ehLixo = clusterId === CID_LIXO;

  return (
    <div className={`work-body ${pilha ? "work-pilha" : ""}`} ref={bodyRef} onPointerDown={onDragSelect}>
      <header className={`clu-header ${isNoise ? "noise" : ""} ${pilha ? (ehLixo ? "hd-lixo" : "hd-confirmar") : ""}`}>
        <div className="ch-title">
          <h1>{pilha ? (ehLixo ? LIXO : A_CONFIRMAR) : isNoise ? "Ruído" : `Cluster ${clusterId}`}</h1>
          {!isNoise && !pilha && <GenBadge gen={metrics?.origem ?? 0} />}
          {!pilha && (
            <div className="ch-ring">
              <Ring pct={pct} size={52} stroke={5} />
            </div>
          )}
        </div>
        <div className="metric-chips">
          {pilha ? (
            // uma frase, não três chips: aqui não há métricas a comparar, há uma
            // contagem — e uma contagem lê-se de uma vez
            <span className="chip k-size pilha-conta">
              <b>{total}</b> {total === 1 ? "imagem" : "imagens"} de <b>{nOrigens}</b>{" "}
              {nOrigens === 1 ? "grupo" : "grupos"}
            </span>
          ) : (
          <>
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
            ) : activeSpecies === A_CONFIRMAR ? (
              <>
                <span className="sp-lixo-icon" style={{ color: "var(--amber)", display: "grid", placeItems: "center" }}>
                  <IconHelp size={15} />
                </span>
                <span className="as-name" style={{ color: "var(--amber)" }}>{A_CONFIRMAR}</span>
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
                  {/* uma FAMÍLIA lê-se de relance como tal, aqui pelas mesmas
                      razões do painel direito: chapa de nível em vez de
                      miniatura, versaletes, e nenhum espaço vazio onde estaria
                      um código que se decidiu não ter */}
                  {rankOf(l) === "familia" ? (
                    <>
                      <span className="dd-fam-mark">
                        <IconRank size={14} />
                      </span>
                      <span className="dd-name dd-fam">{l}</span>
                      <span className="dd-nivel">família</span>
                    </>
                  ) : (
                    <>
                      <SpeciesThumb file={thumbOf(l)} size={22} />
                      <span className="dd-name">{l}</span>
                      {eppoOf(l) && <span className="eppo-chip has mono">{eppoOf(l)}</span>}
                    </>
                  )}
                  <span className="sw" style={{ background: colorOf(l) }} />
                </button>
              ))}
              {/* Categorias reservadas no fim — MENOS a da pilha em que estamos:
                  dentro do Lixo, "Lixo" não é um destino, é o sítio onde já se
                  está. Oferecê-la seria oferecer uma acção sem efeito. */}
              <div className="dd-sep" />
              {clusterId !== CID_CONFIRMAR && (
                <button
                  onClick={() => {
                    onSetActive(A_CONFIRMAR);
                    setDdOpen(false);
                  }}
                >
                  <span className="sp-lixo-icon" style={{ color: "var(--amber)", display: "grid", placeItems: "center" }}>
                    <IconHelp size={15} />
                  </span>
                  <span className="dd-name" style={{ color: "var(--amber)" }}>{A_CONFIRMAR}</span>
                </button>
              )}
              {clusterId !== CID_LIXO && (
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
              )}
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
        {/* nas pilhas não há secções de anotadas para mostrar ou esconder */}
        {!pilha && (
          <label className="toggle">
            <input type="checkbox" checked={showAnnotated} onChange={(e) => onToggleShowAnnotated(e.target.checked)} />
            <span className="tk" />
            Mostrar anotadas
          </label>
        )}
      </div>

      {/* Por classificar (numa pilha: por confirmar / descartadas) */}
      <div className="section-head">
        <span className="sh-bar" />
        <span className="sh-title">
          {pilha ? (ehLixo ? "Descartadas" : "Por confirmar") : "Por classificar"}
        </span>
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
          <div className="es-title">
            {pilha
              ? ehLixo
                ? "Não há nada no lixo"
                : "Não há nada por confirmar"
              : total === 0
                ? "Grupo vazio"
                : "Tudo anotado neste grupo"}
          </div>
          <div className="es-sub">
            {pilha
              ? "Volta a um grupo pela lista da esquerda."
              : total === 0
                ? "Não há imagens aqui."
                : "Bom trabalho — salta para o próximo com J."}
          </div>
        </div>
      ) : pilha ? (
        <>
          {porOrigem.map(([cid, files]) => {
            const todasSel = files.every((f) => selection.has(f));
            return (
              <div className="pilha-grupo" key={cid}>
                <div className="pilha-grupo-h">
                  <button
                    className={`svb-check ${todasSel ? "on" : ""}`}
                    title={todasSel ? "Desselecionar estas" : "Selecionar as deste grupo"}
                    onClick={() => onToggleMany(files)}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13">
                      <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {/* o NOME do grupo é o próprio link — não faz sentido um botão
                      separado a dizer "ver o grupo" ao lado do nome do grupo */}
                  <button
                    className="pg-nome mono pg-link"
                    onClick={() => onGoToOrigem(cid, files)}
                    title="Ir para o grupo de origem — as vizinhas ajudam a desempatar"
                  >
                    {cid === -1 ? "ruído" : `c${cid}`}
                    <span className="chip-go">→</span>
                  </button>
                  <span className="pg-n">
                    {files.length} {files.length === 1 ? "imagem" : "imagens"}
                  </span>
                </div>
                {/* Sem localizador POR CARTÃO aqui: dentro de um bloco todos vêm
                    do mesmo grupo, por isso o botão do cartão era o mesmo destino
                    repetido tantas vezes quantas as imagens. O controlo pertence
                    ao bloco, que é o nível a que a informação se aplica — e o
                    hover do cartão fica livre para o que é dele (examinar). */}
                <div className="grid">
                  {files.map((f, i) => (
                    <Card
                      key={f}
                      filename={f}
                      index={i}
                      selected={selection.has(f)}
                      hidden={flying.has(f)}
                      onToggle={() => onToggleSelect(f)}
                      onOpen={() => onOpenLightbox(f, unannotated)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {totalPages > 1 && <Pagination page={effPage} total={totalPages} onPage={onPage} />}
        </>
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
      {!pilha && showAnnotated && groups.length > 0 && (
        <div className="section-head">
          <span className="sh-bar" />
          <span className="sh-title">Espécies presentes neste cluster</span>
          <span className="sh-count mono">{groups.length}</span>
        </div>
      )}
      {!pilha && showAnnotated &&
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

      {/* "A confirmar" — secção própria. Fica ANTES do Lixo porque estas imagens
          são boas e voltam a ser trabalhadas; o Lixo não volta. */}
      {!pilha && showAnnotated && confirmarFiles.length > 0 && (
        <div className="lixo-bin confirmar-bin">
          <div className="lixo-head">
            <button
              className={`svb-check ${confirmarAllSel ? "on" : ""}`}
              title={confirmarAllSel ? "Desselecionar" : "Selecionar tudo por confirmar"}
              onClick={() => onToggleMany(confirmarFiles)}
            >
              <svg viewBox="0 0 24 24" width="13" height="13">
                <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="lixo-mark"><IconHelp size={18} /></span>
            <span className="lixo-title">{A_CONFIRMAR}</span>
            <span className="lixo-note">
              {confirmarFiles.length}{" "}
              {confirmarFiles.length === 1
                ? "plântula por confirmar"
                : "plântulas por confirmar"}
            </span>
          </div>
          <div className="grid">
            {confirmarFiles.map((f, i) => (
              <Card
                key={f}
                filename={f}
                index={i}
                selected={selection.has(f)}
                onToggle={() => onToggleSelect(f)}
                onOpen={() => onOpenLightbox(f, confirmarFiles)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lixo — NÃO é uma espécie nem uma secção como as outras. Lê-se como uma
          cavidade na página (ver .bin-lixo): fundo escavado, miniaturas a
          cinzento e recolhido por omissão. A cor volta ao passar o rato, que é
          a única razão pela qual vale a pena mantê-lo à vista — dar por uma
          imagem que não devia ter sido deitada fora. */}
      {!pilha && showAnnotated && lixoFiles.length > 0 && (
        <div className={`lixo-bin bin-lixo ${lixoOpen ? "open" : ""}`}>
          <div
            className="lixo-head"
            onClick={() => setLixoOpen((v) => !v)}
            title={lixoOpen ? "Recolher o lixo" : "Ver o que foi deitado fora neste grupo"}
          >
            <span className="lixo-fold" aria-hidden>
              {lixoOpen ? "▾" : "▸"}
            </span>
            <span className="lixo-mark"><IconTrash size={16} /></span>
            <span className="lixo-title">{LIXO}</span>
            <span className="lixo-note">
              {lixoFiles.length} {lixoFiles.length === 1 ? "imagem descartada" : "imagens descartadas"}
            </span>
            {lixoOpen && (
              <button
                className={`svb-check ${lixoAllSel ? "on" : ""}`}
                title={lixoAllSel ? "Desselecionar" : "Selecionar tudo no lixo"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMany(lixoFiles);
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13">
                  <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          {lixoOpen && (
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
          )}
        </div>
      )}
    </div>
  );
}
