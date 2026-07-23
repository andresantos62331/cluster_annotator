import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { GroundTruth } from "../types";
import { LIXO, tint } from "../colors";
import { Card } from "./Card";
import { Pagination } from "./bits";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { CollectionOverview } from "./CollectionOverview";
import { EppoChip, TaxonEditor } from "./EppoInput";
import type { EppoEntry } from "../eppo";
import { IconChevron, IconTrash } from "./icons";

// rótulo para espécies sem código EPPO (logo, sem família conhecida)
const SEM_FAMILIA = "Sem família";

// densidade da grelha: lado mínimo do cartão + imagens por página
const DENSITIES = [
  { min: 150, perPage: 30, label: "cartões grandes" },
  { min: 104, perPage: 60, label: "cartões médios" },
  { min: 76, perPage: 120, label: "cartões pequenos" },
] as const;

// Vista invertida: um bloco por espécie com TODAS as imagens anotadas com ela
// (em qualquer cluster). Cabeçalho tipo "ficha de herbário" (faixa de cor,
// contagem, nº de clusters de origem), sticky durante o scroll, colapsável e
// com TOC lateral. Ordenação: alfabética ou por tamanho (sem drag & drop aqui —
// reordenar à mão é no painel da direita, que manda nos atalhos 1-9).
export function SpeciesView({
  labels,
  groundTruth,
  colorOf,
  speciesPage,
  setSpeciesPage,
  selection,
  setSelection,
  onRemoveLabels,
  onReassign,
  onOpenLightbox,
  onEditSpecies,
  onRemove,
  onSetColor,
  eppoOf,
  familyOf,
  eppoVocab,
  totalAll,
  thumbOf,
  clusterOf,
  onGoToCluster,
  onOpenCluster,
  focus,
  onFocusHandled,
}: {
  labels: string[];
  groundTruth: GroundTruth;
  colorOf: (l: string) => string;
  speciesPage: Record<string, number>;
  setSpeciesPage: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  selection: Set<string>;
  setSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  onRemoveLabels: () => void;
  onReassign: (label: string) => void;
  onOpenLightbox: (f: string, scope: string[]) => void;
  onEditSpecies: (oldName: string, name: string, code: string, family: string) => void;
  onRemove: (l: string) => void;
  onSetColor: (l: string, hex: string) => void;
  eppoOf: (l: string) => string;
  familyOf: (l: string) => string;
  eppoVocab: EppoEntry[];
  totalAll: number;
  thumbOf: (l: string) => string | null;
  clusterOf: (f: string) => number | null;
  onGoToCluster: (f: string) => void;
  onOpenCluster: (cid: number) => void;
  focus: string | null;
  onFocusHandled: () => void;
}) {
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // preferências da vista persistidas entre sessões (localStorage, como o resto tese3.*)
  const [sortBy, setSortBy] = useState<"alfabetica" | "tamanho">(() =>
    localStorage.getItem("tese3.sv_sort") === "tamanho" ? "tamanho" : "alfabetica",
  );
  const [density, setDensity] = useState(() => {
    const n = parseInt(localStorage.getItem("tese3.sv_density") ?? "0", 10);
    return Number.isInteger(n) && n >= 0 && n < DENSITIES.length ? n : 0;
  });
  useEffect(() => {
    localStorage.setItem("tese3.sv_sort", sortBy);
  }, [sortBy]);
  useEffect(() => {
    localStorage.setItem("tese3.sv_density", String(density));
  }, [density]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // hover numa barra do histograma -> realça na grelha as imagens desse cluster
  const [histHover, setHistHover] = useState<{ lbl: string; cid: number } | null>(null);

  // scroll até à espécie clicada no painel direito (e realça-a brevemente)
  useEffect(() => {
    if (!focus) return;
    setCollapsed((prev) => {
      if (!prev.has(focus)) return prev;
      const next = new Set(prev);
      next.delete(focus); // expandir antes de focar
      return next;
    });
    const el = blockRefs.current[focus];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 1200);
    }
    onFocusHandled();
  }, [focus, onFocusHandled]);

  const byLabel = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const [f, l] of Object.entries(groundTruth)) (m[l] ??= []).push(f);
    for (const k of Object.keys(m)) m[k].sort();
    return m;
  }, [groundTruth]);

  // ordenação de display: espécies AGRUPADAS POR FAMÍLIA botânica (a família
  // engloba espécies). Dentro da família e entre famílias segue o sortBy
  // (alfabético ou por população). "Sem família" (sem código EPPO) fica no fim,
  // e o Lixo sempre no fim de tudo.
  const famOf = (l: string) => familyOf(l) || SEM_FAMILIA;
  const displayLabels = useMemo(() => {
    const real = labels.filter((l) => l !== LIXO);
    if (sortBy === "alfabetica") real.sort((a, b) => a.localeCompare(b, "pt"));
    else real.sort((a, b) => (byLabel[b]?.length ?? 0) - (byLabel[a]?.length ?? 0));

    const famImages = new Map<string, number>();
    for (const l of real) {
      const f = familyOf(l) || SEM_FAMILIA;
      famImages.set(f, (famImages.get(f) ?? 0) + (byLabel[l]?.length ?? 0));
    }
    const famNames = [...famImages.keys()].sort((a, b) => {
      const aNo = a === SEM_FAMILIA, bNo = b === SEM_FAMILIA;
      if (aNo !== bNo) return aNo ? 1 : -1; // "Sem família" por último
      if (sortBy === "alfabetica") return a.localeCompare(b, "pt");
      return (famImages.get(b) ?? 0) - (famImages.get(a) ?? 0);
    });
    const rank = new Map(famNames.map((n, i) => [n, i] as const));
    const idx = new Map(real.map((l, i) => [l, i] as const));
    const ordered = [...real].sort((a, b) => {
      const ra = rank.get(familyOf(a) || SEM_FAMILIA)!;
      const rb = rank.get(familyOf(b) || SEM_FAMILIA)!;
      return ra !== rb ? ra - rb : idx.get(a)! - idx.get(b)!;
    });
    return labels.includes(LIXO) ? [...ordered, LIXO] : ordered;
  }, [labels, sortBy, byLabel, familyOf]);

  // nº de espécies por família (para o cabeçalho de cada família)
  const famSpeciesCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of labels) if (l !== LIXO) {
      const f = familyOf(l) || SEM_FAMILIA;
      m.set(f, (m.get(f) ?? 0) + 1);
    }
    return m;
  }, [labels, familyOf]);

  // o Lixo vem incluído em `labels` (último); só conta como conteúdo se tiver imagens
  const isEmpty =
    labels.filter((l) => l !== LIXO).length === 0 && (byLabel[LIXO]?.length ?? 0) === 0;

  if (isEmpty) {
    return (
      <div className="work-body">
        <div className="empty-state">
          <div className="es-title">Sem espécies</div>
          <div className="es-sub">Cria espécies no painel da direita para as auditares aqui.</div>
        </div>
      </div>
    );
  }

  const den = DENSITIES[density];
  // o índice lateral e a contagem "Espécies" são só de espécies — o Lixo fica de fora
  const tocLabels = displayLabels.filter((l) => l !== LIXO);

  return (
    <div className="work-body sv" style={{ ["--card-min" as string]: `${den.min}px` }}>
      {/* resumo da Coleção — panorama antes das fichas por espécie */}
      <CollectionOverview
        labels={labels}
        groundTruth={groundTruth}
        colorOf={colorOf}
        familyOf={familyOf}
        totalAll={totalAll}
        onPick={(lbl) => {
          setCollapsed((prev) => {
            if (!prev.has(lbl)) return prev;
            const n = new Set(prev);
            n.delete(lbl);
            return n;
          });
          requestAnimationFrame(() =>
            blockRefs.current[lbl]?.scrollIntoView({ behavior: "smooth", block: "start" }),
          );
        }}
      />

      {selection.size > 0 && (
        <div className="action-bar">
          <div className="sel-count has">{selection.size} selecionada(s)</div>
          <ReassignMenu labels={labels} thumbOf={thumbOf} onPick={onReassign} />
          <button className="btn warn" onClick={onRemoveLabels} title="As imagens voltam a 'por classificar'">
            Remover etiqueta <span className="kbd">R</span>
          </button>
          <div className="spacer" />
          <button className="btn" onClick={() => setSelection(new Set())}>
            Desselecionar <span className="kbd">Esc</span>
          </button>
        </div>
      )}

      <div className="section-head co-species-head">
        <span className="sh-bar" />
        <span className="sh-title">Espécies</span>
        <span className="sh-count mono">{tocLabels.length}</span>
      </div>

      {/* ferramentas da vista: ordenação + densidade */}
      <div className="sv-tools">
        <span className="sv-tools-label">Ordenar</span>
        <div className="seg">
          <button className={sortBy === "alfabetica" ? "on" : ""} onClick={() => setSortBy("alfabetica")} title="Por ordem alfabética">
            A–Z
          </button>
          <button className={sortBy === "tamanho" ? "on" : ""} onClick={() => setSortBy("tamanho")} title="Mais imagens primeiro">
            População
          </button>
        </div>
        <span className="sv-tools-label">Densidade</span>
        <div className="seg">
          {DENSITIES.map((d, i) => (
            <button key={i} className={density === i ? "on" : ""} onClick={() => setDensity(i)} title={d.label}>
              <span className="sv-den" style={{ width: 13 - i * 3.5, height: 13 - i * 3.5 }} />
            </button>
          ))}
        </div>
        <div className="spacer" />
      </div>

      {/* índice lateral: uma bolinha por espécie, clicável */}
      {tocLabels.length > 1 && (
        <div className="sv-toc" aria-label="Índice de espécies">
          {tocLabels.map((lbl) => (
            <button
              key={lbl}
              style={{ background: colorOf(lbl) }}
              title={`${lbl} (${byLabel[lbl]?.length ?? 0})`}
              onClick={() =>
                blockRefs.current[lbl]?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          ))}
        </div>
      )}

      {displayLabels.map((lbl, i) => {
        const isLixo = lbl === LIXO;
        const files = byLabel[lbl] ?? [];
        if (isLixo && files.length === 0) return null; // sem lixo, sem bloco
        // cabeçalho de família: aparece quando a família muda (espécies só)
        const fam = isLixo ? "" : famOf(lbl);
        const showFamHeader = !isLixo && (i === 0 || famOf(displayLabels[i - 1]) !== fam);
        const isCollapsed = collapsed.has(lbl);
        const totalPages = Math.max(1, Math.ceil(files.length / den.perPage));
        const page = speciesPage[lbl] ?? 0;
        const effPage = Math.min(page, totalPages - 1);
        const pageFiles = files.slice(effPage * den.perPage, (effPage + 1) * den.perPage);
        const allSel = files.length > 0 && files.every((f) => selection.has(f));
        const col = colorOf(lbl);
        // população por cluster de origem (config atual) -> frase + top 3
        const clusterCounts = new Map<number, number>();
        for (const f of files) {
          const c = clusterOf(f);
          if (c != null) clusterCounts.set(c, (clusterCounts.get(c) ?? 0) + 1);
        }
        const nClusters = clusterCounts.size;
        const top3 = [...clusterCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const maxN = top3[0]?.[1] ?? 1;
        const toggleFold = () =>
          setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(lbl)) next.delete(lbl);
            else next.add(lbl);
            return next;
          });

        return (
          <Fragment key={lbl}>
            {showFamHeader && (
              <div className="fam-divider">
                <span className="fam-name">{fam}</span>
                <span className="fam-meta mono">
                  {famSpeciesCount.get(fam) ?? 0} {(famSpeciesCount.get(fam) ?? 0) === 1 ? "espécie" : "espécies"}
                </span>
                <span className="fam-line" />
              </div>
            )}
          <div
            className={`species-view-block ${isLixo ? "svb-lixo-block" : ""}`}
            ref={(el) => {
              blockRefs.current[lbl] = el;
            }}
          >
            {/* "ficha de herbário": faixa de cor, sticky; clicar na faixa colapsa/
                expande (os controlos lá dentro travam a propagação) */}
            <div
              className="svb-head svb-head-click"
              style={isLixo ? undefined : { background: `linear-gradient(90deg, ${tint(col, 0.13)}, rgba(0,0,0,0) 75%), var(--bg)` }}
              onClick={toggleFold}
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              <span className="svb-fold" aria-hidden>
                {isCollapsed ? "▸" : "▾"}
              </span>
              {files.length > 0 && (
                <button
                  className={`svb-check ${allSel ? "on" : ""}`}
                  title={allSel ? "Desselecionar todas" : "Selecionar todas desta espécie"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelection((prev) => {
                      const next = new Set(prev);
                      if (allSel) for (const f of files) next.delete(f);
                      else for (const f of files) next.add(f);
                      return next;
                    });
                  }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13">
                    <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {isLixo ? (
                <span className="svb-lixo-mark" style={{ color: "var(--danger)" }} title="Categoria reservada — não é uma espécie">
                  <IconTrash size={17} />
                </span>
              ) : (
                <SpeciesColorDot color={col} onPick={(hex) => onSetColor(lbl, hex)} />
              )}
              <h3>
                <span className="svb-name" style={{ color: isLixo ? "var(--danger)" : col }}>{lbl}</span>
                {isLixo ? (
                  <span className="svb-lixo-note">
                    categoria reservada{files.length > 0 ? ` · ${files.length}` : ""}
                  </span>
                ) : (
                  <>
                    {/* chip só-leitura; a edição está no lápis, como no painel direito */}
                    <EppoChip code={eppoOf(lbl)} label={lbl} vocab={eppoVocab} />
                    {files.length > 0 && (
                      <span className="svb-pop" title="população desta espécie (clusters da config atual)">
                        {files.length} {files.length === 1 ? "imagem presente" : "imagens presentes"} em{" "}
                        {nClusters} {nClusters === 1 ? "cluster" : "clusters"}
                      </span>
                    )}
                    <TaxonEditor
                      label={lbl}
                      code={eppoOf(lbl)}
                      family={familyOf(lbl)}
                      vocab={eppoVocab}
                      className="svb-edit"
                      size={15}
                      onSave={(name, code, family) => onEditSpecies(lbl, name, code, family)}
                    />
                  </>
                )}
              </h3>
              {/* histograma interativo: top 3 clusters com mais imagens desta espécie */}
              {!isLixo && top3.length > 0 && (
                <div className="svb-hist">
                  {top3.map(([cid, n]) => (
                    <button
                      key={cid}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCluster(cid);
                      }}
                      onMouseEnter={() => setHistHover({ lbl, cid })}
                      onMouseLeave={() => setHistHover(null)}
                      title={`Ir para ${cid === -1 ? "o ruído" : `c${cid}`} (${n} ${n === 1 ? "imagem" : "imagens"})`}
                    >
                      <span className="h-label">{cid === -1 ? "✦" : `c${cid}`}</span>
                      <span className="h-bar">
                        <span style={{ width: `${(n / maxN) * 100}%`, background: tint(col, 0.65) }} />
                      </span>
                      <span className="h-n">{n}</span>
                    </button>
                  ))}
                </div>
              )}
              {!isLixo && (
                <button
                  className="svb-trash"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(lbl);
                  }}
                  title="Remover esta espécie"
                >
                  <IconTrash size={17} />
                </button>
              )}
            </div>

            {isCollapsed ? null : files.length === 0 ? (
              <div className="svb-meta" style={{ color: "var(--faint)" }}>
                Ainda sem imagens.
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
                      // sem moldura da cor da espécie: o bloco já a identifica.
                      // hover numa barra do histograma LEVANTA as imagens desse cluster
                      raised={histHover?.lbl === lbl && clusterOf(f) === histHover.cid}
                      raiseColor={col}
                      sourceClusterId={clusterOf(f) ?? undefined}
                      onGoToCluster={() => onGoToCluster(f)}
                      onToggle={() =>
                        setSelection((prev) => {
                          const next = new Set(prev);
                          if (next.has(f)) next.delete(f);
                          else next.add(f);
                          return next;
                        })
                      }
                      onOpen={() => onOpenLightbox(f, files)}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    page={effPage}
                    total={totalPages}
                    onPage={(n) => setSpeciesPage((prev) => ({ ...prev, [lbl]: n }))}
                  />
                )}
              </>
            )}
          </div>
          </Fragment>
        );
      })}
    </div>
  );
}

// Dropdown para reatribuir a selecção a outra espécie (correção sem ir aos clusters).
function ReassignMenu({
  labels,
  thumbOf,
  onPick,
}: {
  labels: string[];
  thumbOf: (l: string) => string | null;
  onPick: (l: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="reassign" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)} title="Mover a selecção para outra espécie">
        Mover para <IconChevron size={13} />
      </button>
      {open && (
        <div className="sp-dropdown reassign-dd">
          {labels.length === 0 && <div className="dd-empty">Sem espécies.</div>}
          {/* ordem alfabética, como no dropdown de atribuição */}
          {[...labels].sort((a, b) => a.localeCompare(b, "pt")).map((l) => (
            <button
              key={l}
              onClick={() => {
                onPick(l);
                setOpen(false);
              }}
            >
              <SpeciesThumb file={thumbOf(l)} size={20} />
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
