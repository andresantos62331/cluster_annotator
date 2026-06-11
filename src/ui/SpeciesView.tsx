import { useEffect, useMemo, useRef, useState } from "react";
import type { GroundTruth } from "../types";
import { Card } from "./Card";
import { Pagination } from "./bits";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { IconPencil, IconChevron, IconTrash } from "./icons";

const IMAGES_PER_PAGE = 30;

// Vista invertida: um bloco por espécie com TODAS as imagens anotadas com ela
// (em qualquer cluster), paginado. Permite selecionar em lote e remover labels.
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
  onRename,
  onRemove,
  onSetColor,
  thumbOf,
  clusterOf,
  onGoToCluster,
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
  onOpenLightbox: (f: string) => void;
  onRename: (l: string) => void;
  onRemove: (l: string) => void;
  onSetColor: (l: string, hex: string) => void;
  thumbOf: (l: string) => string | null;
  clusterOf: (f: string) => number | null;
  onGoToCluster: (f: string) => void;
  focus: string | null;
  onFocusHandled: () => void;
}) {
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // scroll até à espécie clicada no painel direito (e realça-a brevemente)
  useEffect(() => {
    if (!focus) return;
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

  if (labels.length === 0) {
    return (
      <div className="work-body">
        <div className="empty-state">
          <div className="es-icon">❧</div>
          <div className="es-title">Sem espécies</div>
          <div className="es-sub">Cria espécies no painel da direita para as auditares aqui.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-body">
      {selection.size > 0 && (
        <div className="action-bar">
          <div className="sel-count has">{selection.size} selecionada(s)</div>
          <ReassignMenu labels={labels} colorOf={colorOf} thumbOf={thumbOf} onPick={onReassign} />
          <button className="btn warn" onClick={onRemoveLabels} title="As imagens voltam a 'por classificar'">
            Remover etiqueta
          </button>
          <div className="spacer" />
          <button className="btn" onClick={() => setSelection(new Set())}>
            Limpar selecção
          </button>
        </div>
      )}

      {labels.map((lbl) => {
        const files = byLabel[lbl] ?? [];
        const page = speciesPage[lbl] ?? 0;
        const totalPages = Math.max(1, Math.ceil(files.length / IMAGES_PER_PAGE));
        const effPage = Math.min(page, totalPages - 1);
        const pageFiles = files.slice(effPage * IMAGES_PER_PAGE, (effPage + 1) * IMAGES_PER_PAGE);
        const allSel = files.length > 0 && files.every((f) => selection.has(f));
        const col = colorOf(lbl);

        return (
          <div
            className="species-view-block"
            key={lbl}
            ref={(el) => {
              blockRefs.current[lbl] = el;
            }}
          >
            <div className="svb-head">
              {files.length > 0 && (
                <button
                  className={`svb-check ${allSel ? "on" : ""}`}
                  title={allSel ? "Desselecionar todas" : "Selecionar todas desta espécie"}
                  onClick={() =>
                    setSelection((prev) => {
                      const next = new Set(prev);
                      if (allSel) for (const f of files) next.delete(f);
                      else for (const f of files) next.add(f);
                      return next;
                    })
                  }
                >
                  <svg viewBox="0 0 24 24" width="13" height="13">
                    <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <SpeciesColorDot color={col} onPick={(hex) => onSetColor(lbl, hex)} />
              <h3>
                <span className="svb-name" style={{ color: col }}>{lbl}</span>
                <span className="svb-count" title="imagens anotadas com esta espécie">{files.length}</span>
                <button className="svb-edit" onClick={() => onRename(lbl)} title="Renomear espécie">
                  <IconPencil size={15} />
                </button>
              </h3>
              <button className="svb-trash" onClick={() => onRemove(lbl)} title="Remover esta espécie">
                <IconTrash size={17} />
              </button>
            </div>

            {files.length === 0 ? (
              <div className="svb-meta" style={{ color: "var(--faint)" }}>
                Ainda sem imagens.
              </div>
            ) : (
              <>
                {totalPages > 1 && (
                  <Pagination
                    page={effPage}
                    total={totalPages}
                    onPage={(n) => setSpeciesPage((prev) => ({ ...prev, [lbl]: n }))}
                  />
                )}
                <div className="grid">
                  {pageFiles.map((f, i) => (
                    <Card
                      key={f}
                      filename={f}
                      index={i}
                      selected={selection.has(f)}
                      label={lbl}
                      color={col}
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
                      onOpen={() => onOpenLightbox(f)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Dropdown para reatribuir a selecção a outra espécie (correção sem ir aos clusters).
function ReassignMenu({
  labels,
  colorOf,
  thumbOf,
  onPick,
}: {
  labels: string[];
  colorOf: (l: string) => string;
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
          {labels.map((l) => (
            <button
              key={l}
              onClick={() => {
                onPick(l);
                setOpen(false);
              }}
            >
              <SpeciesThumb file={thumbOf(l)} color={colorOf(l)} size={20} />
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
