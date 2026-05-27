import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import "./index.css";
import { CONFIG_DEFS, loadConfig } from "./loader";
import { exportCSV, exportJSON, loadColorMap, loadGT, loadLabels, saveColorMap, saveGT, saveLabels, saveToCloud, setCloudKey } from "./storage";
import { PALETTE, textOn } from "./colors";
import type { ConfigData, GroundTruth } from "./types";

const IMAGES_PER_PAGE = 30;

export default function App() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [configId, setConfigId] = useState<string>("B_leaf_aggressive");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groundTruth, setGroundTruth] = useState<GroundTruth>(() => loadGT());
  const [labels, setLabels] = useState<string[]>(() => loadLabels());

  const [currentClusterId, setCurrentClusterId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"clusters" | "species">("clusters");
  const [labelChoice, setLabelChoice] = useState<string>("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [speciesPage, setSpeciesPage] = useState<Record<string, number>>({});
  const [speciesSelection, setSpeciesSelection] = useState<Set<string>>(new Set());
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [colorMap, setColorMap] = useState<Record<string, number>>(() => loadColorMap());
  const [showAnnotated, setShowAnnotated] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const def = CONFIG_DEFS.find((d) => d.id === configId)!;
    loadConfig(def)
      .then((data) => {
        setConfig(data);
        setCurrentClusterId(data.clusterIds[0] ?? null);
        setPage(0);
        setSelection(new Set());
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [configId]);

  useEffect(() => { saveGT(groundTruth); }, [groundTruth]);
  useEffect(() => { saveLabels(labels); }, [labels]);

  // atribui uma cor estavel (proxima livre na PALETTE) a cada especie nova
  useEffect(() => {
    const cur = loadColorMap();
    let changed = false;
    for (const l of labels) {
      if (!(l in cur)) {
        cur[l] = Object.keys(cur).length % PALETTE.length;
        changed = true;
      }
    }
    if (changed) {
      saveColorMap(cur);
      setColorMap({ ...cur });
    }
  }, [labels]);

  // chave de acesso a cloud via link magico (?k=...): guarda e limpa o URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get("k");
    if (k) {
      setCloudKey(k);
      params.delete("k");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  useEffect(() => {
    if (labelChoice && !labels.includes(labelChoice)) {
      setLabelChoice(labels[0] ?? "");
    } else if (!labelChoice && labels.length > 0) {
      setLabelChoice(labels[0]);
    }
  }, [labels, labelChoice]);

  const allFilenames = useMemo(() => config?.assignments.map((a) => a.filename) ?? [], [config]);
  const totalAnnotated = useMemo(
    () => allFilenames.filter((f) => groundTruth[f]).length,
    [allFilenames, groundTruth],
  );

  const clusterFilenames = useMemo(() => {
    if (!config || currentClusterId == null) return [] as string[];
    return config.byCluster.get(currentClusterId) ?? [];
  }, [config, currentClusterId]);

  const unannotatedInCluster = useMemo(
    () => clusterFilenames.filter((f) => !groundTruth[f]),
    [clusterFilenames, groundTruth],
  );

  // anotadas deste cluster agrupadas por especie (ordenadas por contagem desc)
  const annotatedGroups = useMemo(() => {
    const by: Record<string, string[]> = {};
    for (const f of clusterFilenames) {
      const lb = groundTruth[f];
      if (lb) (by[lb] ??= []).push(f);
    }
    return Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  }, [clusterFilenames, groundTruth]);

  const totalPages = Math.max(1, Math.ceil(unannotatedInCluster.length / IMAGES_PER_PAGE));
  const effectivePage = Math.min(page, totalPages - 1);
  const pageFiles = unannotatedInCluster.slice(
    effectivePage * IMAGES_PER_PAGE,
    (effectivePage + 1) * IMAGES_PER_PAGE,
  );

  const addLabel = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLabels((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const removeLabel = useCallback((name: string) => {
    if (!confirm(`Remover a espécie "${name}"?\n\nTodas as anotações com esta espécie serão limpas.`)) return;
    setLabels((prev) => prev.filter((l) => l !== name));
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === name) delete next[k];
      return next;
    });
  }, []);

  const renameLabel = useCallback((oldName: string) => {
    const newName = prompt(`Renomear "${oldName}" para:`, oldName)?.trim();
    if (!newName || newName === oldName) return;
    if (labels.includes(newName)) {
      alert("Já existe uma espécie com esse nome.");
      return;
    }
    setLabels((prev) => prev.map((l) => (l === oldName ? newName : l)));
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === oldName) next[k] = newName;
      return next;
    });
    if (labelChoice === oldName) setLabelChoice(newName);
  }, [labels, labelChoice]);

  const assignToSelection = useCallback(() => {
    if (!labelChoice || selection.size === 0) return;
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const f of selection) next[f] = labelChoice;
      return next;
    });
    setSelection(new Set());
  }, [labelChoice, selection]);

  const toggleSelect = useCallback((filename: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelection((prev) => {
      const next = new Set(prev);
      const allSelected = pageFiles.every((f) => next.has(f));
      if (allSelected) for (const f of pageFiles) next.delete(f);
      else for (const f of pageFiles) next.add(f);
      return next;
    });
  }, [pageFiles]);

  const selectAllInCluster = useCallback(() => {
    setSelection((prev) => {
      const next = new Set(prev);
      const allSel = unannotatedInCluster.every((f) => next.has(f));
      if (allSel) for (const f of unannotatedInCluster) next.delete(f);
      else for (const f of unannotatedInCluster) next.add(f);
      return next;
    });
  }, [unannotatedInCluster]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        if (data.ground_truth && typeof data.ground_truth === "object") {
          setGroundTruth(data.ground_truth);
        }
        if (Array.isArray(data.labels)) {
          setLabels(data.labels);
        }
        alert(`Importado: ${Object.keys(data.ground_truth ?? {}).length} anotações, ${(data.labels ?? []).length} espécies.`);
      } catch (err) {
        alert(`Erro a importar: ${err}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleCloudSave = useCallback(async () => {
    setCloudSaving(true);
    setCloudStatus(null);
    const r = await saveToCloud(groundTruth, labels, allFilenames);
    setCloudSaving(false);
    setCloudStatus(r.ok ? `Guardado na cloud ✓ (${r.count} anotações)` : `Erro: ${r.error}`);
  }, [groundTruth, labels, allFilenames]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (lightbox && e.key === "Escape") {
        setLightbox(null);
        return;
      }
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      if (activeTab !== "clusters" || !config) return;
      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setPage((p) => Math.min(totalPages - 1, p + 1));
      else if (e.key === "a" || e.key === "A") assignToSelection();
      else if (e.key === "d" || e.key === "D") setSelection(new Set());
      else if (e.key === "j" || e.key === "J") {
        if (currentClusterId == null) return;
        const i = config.clusterIds.indexOf(currentClusterId);
        const next = config.clusterIds[(i + 1) % config.clusterIds.length];
        setCurrentClusterId(next);
        setPage(0);
        setSelection(new Set());
      } else if (e.key === "k" || e.key === "K") {
        if (currentClusterId == null) return;
        const i = config.clusterIds.indexOf(currentClusterId);
        const next = config.clusterIds[(i - 1 + config.clusterIds.length) % config.clusterIds.length];
        setCurrentClusterId(next);
        setPage(0);
        setSelection(new Set());
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, config, currentClusterId, totalPages, assignToSelection, lightbox]);

  const colorOf = (label: string): string => {
    const i = colorMap[label];
    return i == null ? "#9ca3af" : PALETTE[i % PALETTE.length];
  };

  if (loading || !config) {
    return (
      <div className="empty mono">
        {error ? `Erro: ${error}` : "A carregar config..."}
      </div>
    );
  }

  const currentMetrics = currentClusterId != null ? config.metrics.get(currentClusterId) ?? null : null;
  const currentClusterCount = clusterFilenames.length;
  const currentAnnotated = clusterFilenames.filter((f) => groundTruth[f]).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <section className="config-block">
          <h2>Clustering</h2>
          <select value={configId} onChange={(e) => setConfigId(e.target.value)}>
            {CONFIG_DEFS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <div className="hint">
            {config.clusterIds.filter((c) => c !== -1).length} clusters · {config.byCluster.get(-1)?.length ?? 0} ruído
          </div>
        </section>

        <section>
          <h2>Progresso global</h2>
          <div className="progress">
            <div style={{ width: `${allFilenames.length ? (totalAnnotated / allFilenames.length) * 100 : 0}%` }} />
          </div>
          <div className="mono dim" style={{ fontSize: 11 }}>
            {totalAnnotated} / {allFilenames.length} anotadas
          </div>
        </section>

        <section>
          <h2>Espécies</h2>
          <NewSpecies onAdd={addLabel} />
          <div style={{ marginTop: 8 }}>
            {labels.length === 0 && <div className="hint">Sem espécies criadas.</div>}
            {labels.map((lbl) => {
              const count = Object.values(groundTruth).filter((v) => v === lbl).length;
              return (
                <div className="species-row" key={lbl}>
                  <span className="swatch" style={{ background: colorOf(lbl) }} />
                  <span
                    className="sp-name"
                    onClick={() => renameLabel(lbl)}
                    style={{ cursor: "pointer", flex: 1 }}
                    title="Click para renomear"
                  >
                    {lbl}
                  </span>
                  <span className="sp-count">{count}</span>
                  <button onClick={() => removeLabel(lbl)} title="Remover espécie">×</button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2>Clusters</h2>
          <div className="cluster-list-scroll">
            {config.clusterIds.map((cid) => {
              const files = config.byCluster.get(cid) ?? [];
              const annotated = files.filter((f) => groundTruth[f]).length;
              const pct = files.length ? (annotated / files.length) * 100 : 0;
              const isNoise = cid === -1;
              const isActive = cid === currentClusterId;
              const isDone = files.length > 0 && annotated === files.length;
              return (
                <div
                  key={cid}
                  className={`cluster-list-item ${isNoise ? "noise" : ""} ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                  onClick={() => {
                    setCurrentClusterId(cid);
                    setPage(0);
                    setSelection(new Set());
                  }}
                >
                  <div className="cl-row">
                    <span className="cl-name">{isNoise ? "ruído (-1)" : `c${cid}`} {isDone ? "✓" : ""}</span>
                    <span className="cl-count">{annotated}/{files.length}</span>
                  </div>
                  <div className="cl-progress"><div style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2>Exportar / Importar</h2>
          <div className="btn-row">
            <button onClick={() => exportJSON(groundTruth, labels)}>Export JSON</button>
            <button onClick={() => exportCSV(groundTruth, allFilenames)}>Export CSV</button>
          </div>
          <div className="btn-row">
            <button onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImport}
          />
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button onClick={handleCloudSave} disabled={cloudSaving}>
              {cloudSaving ? "A guardar..." : "Guardar na cloud"}
            </button>
          </div>
          {cloudStatus && (
            <div className="hint" style={{ marginTop: 6 }}>{cloudStatus}</div>
          )}
          <div className="hint" style={{ marginTop: 8 }}>
            Dados em localStorage. "Guardar na cloud" envia tudo para o repositório;
            Export JSON guarda uma cópia local.
          </div>
        </section>
      </aside>

      <main className="main">
        <div className="tabs">
          <button className={activeTab === "clusters" ? "active" : ""} onClick={() => setActiveTab("clusters")}>
            Clusters
          </button>
          <button className={activeTab === "species" ? "active" : ""} onClick={() => setActiveTab("species")}>
            Espécies
          </button>
        </div>

        {activeTab === "clusters" && currentClusterId != null && (
          <>
            <div className={`cluster-header ${currentClusterId === -1 ? "noise" : ""}`}>
              <h1>
                {currentClusterId === -1 ? "Ruído (cluster -1)" : `Cluster ${currentClusterId}`}
              </h1>
              <div className="stats">
                <span>size <b>{currentClusterCount}</b></span>
                <span>anotadas <b>{currentAnnotated}</b></span>
                <span>por anotar <b>{currentClusterCount - currentAnnotated}</b></span>
                {currentMetrics && currentMetrics.cohesion_mean != null && (
                  <>
                    <span>cohesion <b>{currentMetrics.cohesion_mean.toFixed(3)}</b></span>
                    <span>separation <b>{currentMetrics.separation?.toFixed(3) ?? "-"}</b></span>
                    <span>persistence <b>{currentMetrics.persistence?.toFixed(3) ?? "-"}</b></span>
                    {currentMetrics.nearest_cluster != null && (
                      <span>mais próximo <b>c{currentMetrics.nearest_cluster}</b></span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="action-bar">
              <select
                value={labelChoice}
                onChange={(e) => setLabelChoice(e.target.value)}
                disabled={labels.length === 0}
              >
                {labels.length === 0 && <option value="">— sem espécies criadas —</option>}
                {labels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                onClick={assignToSelection}
                disabled={!labelChoice || selection.size === 0}
                title="Atalho: A"
              >
                Atribuir a {selection.size} [A]
              </button>
              <button onClick={selectAllVisible} disabled={pageFiles.length === 0}>
                {pageFiles.every((f) => selection.has(f)) && pageFiles.length > 0
                  ? "Desselecionar página"
                  : "Selecionar página"}
              </button>
              <button onClick={selectAllInCluster} disabled={unannotatedInCluster.length === 0}>
                {unannotatedInCluster.every((f) => selection.has(f)) && unannotatedInCluster.length > 0
                  ? "Desselecionar por classificar"
                  : "Selecionar por classificar"}
              </button>
              <button onClick={() => setSelection(new Set())} disabled={selection.size === 0} title="Atalho: D">
                Limpar [D]
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0, cursor: "pointer", fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={showAnnotated}
                  onChange={(e) => setShowAnnotated(e.target.checked)}
                />
                Mostrar anotadas
              </label>
              <div className="spacer" />
              <div className="count">{selection.size} selecionada(s)</div>
            </div>

            {/* Bloco: imagens ainda por classificar */}
            <div className="group-header">
              <span className="group-title">Por classificar</span>
              <span className="group-count">{unannotatedInCluster.length}</span>
            </div>
            {unannotatedInCluster.length === 0 ? (
              <div className="empty">
                {currentClusterCount === 0
                  ? "Cluster vazio."
                  : "✓ Todas as imagens deste cluster estão anotadas."}
              </div>
            ) : (
              <>
                {totalPages > 1 && (
                  <Pagination page={effectivePage} total={totalPages} onPage={setPage} />
                )}
                <div className="grid">
                  {pageFiles.map((filename) => (
                    <Card
                      key={filename}
                      filename={filename}
                      selected={selection.has(filename)}
                      label={undefined}
                      color={undefined}
                      onToggle={() => toggleSelect(filename)}
                      onOpen={() => setLightbox(filename)}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination page={effectivePage} total={totalPages} onPage={setPage} />
                )}
              </>
            )}

            {/* Blocos por especie (anotadas) — cada especie em nova linha, com cor */}
            {showAnnotated && annotatedGroups.map(([sp, files]) => (
              <div className="species-group" key={sp}>
                <div className="group-header" style={{ borderLeftColor: colorOf(sp) }}>
                  <span className="swatch" style={{ background: colorOf(sp) }} />
                  <span className="group-title" style={{ color: colorOf(sp) }}>{sp}</span>
                  <span className="group-count">{files.length}</span>
                </div>
                <div className="grid">
                  {files.map((filename) => (
                    <Card
                      key={filename}
                      filename={filename}
                      selected={selection.has(filename)}
                      label={sp}
                      color={colorOf(sp)}
                      onToggle={() => toggleSelect(filename)}
                      onOpen={() => setLightbox(filename)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="hint" style={{ marginTop: 30, textAlign: "center" }}>
              atalhos: [A] atribuir · [D] limpar · [←/→] paginar · [J/K] cluster seguinte/anterior · [Esc] fechar lightbox
            </div>
          </>
        )}

        {activeTab === "species" && (
          <SpeciesView
            labels={labels}
            groundTruth={groundTruth}
            colorOf={colorOf}
            speciesPage={speciesPage}
            setSpeciesPage={setSpeciesPage}
            speciesSelection={speciesSelection}
            setSpeciesSelection={setSpeciesSelection}
            setGroundTruth={setGroundTruth}
            onLightbox={setLightbox}
          />
        )}
      </main>

      <Lightbox filename={lightbox} label={lightbox ? groundTruth[lightbox] : undefined} onClose={() => setLightbox(null)} />
    </div>
  );
}

function NewSpecies({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        type="text"
        placeholder="ex: Amaranthus..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(name);
            setName("");
          }
        }}
      />
      <button onClick={() => { onAdd(name); setName(""); }}>+</button>
    </div>
  );
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (n: number) => void }) {
  return (
    <div className="pagination">
      <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}>← anterior</button>
      <span>página {page + 1} de {total}</span>
      <button onClick={() => onPage(Math.min(total - 1, page + 1))} disabled={page === total - 1}>seguinte →</button>
    </div>
  );
}

function Card({
  filename,
  selected,
  label,
  color,
  onToggle,
  onOpen,
}: {
  filename: string;
  selected: boolean;
  label: string | undefined;
  color: string | undefined;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const style = label && color ? { borderColor: color } : undefined;
  return (
    <div
      className={`card ${selected ? "selected" : ""} ${label ? "labeled" : ""}`}
      style={style}
      onClick={onToggle}
      title={filename}
    >
      <img loading="lazy" src={`${baseUrl}crops/${filename}`} alt={filename} />
      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button onClick={onOpen} title="Examinar">🔍</button>
      </div>
      {label && (
        <div
          className="label-pill"
          title={label}
          style={color ? { background: color, color: textOn(color) } : undefined}
        >
          {label}
        </div>
      )}
      <div className="stem">{filename.replace(".jpg", "").slice(-22)}</div>
    </div>
  );
}

function Lightbox({ filename, label, onClose }: { filename: string | null; label?: string; onClose: () => void }) {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const wrapElRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDims(null); }, [filename]);

  const fitToViewport = useCallback((natW: number, natH: number) => {
    const wrap = wrapElRef.current;
    const inst = transformRef.current;
    if (!wrap || !inst) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (!W || !H || !natW || !natH) return;
    const fit = Math.min(W / natW, H / natH, 1);
    const x = (W - natW * fit) / 2;
    const y = (H - natH * fit) / 2;
    inst.setTransform(x, y, fit, 0);
  }, []);

  if (!filename) {
    return <div className="lightbox" />;
  }

  const imgSrc = `${baseUrl}plants/${filename}`;

  return (
    <div className="lightbox open" onClick={onClose}>
      <button className="close" onClick={onClose}>×</button>
      <div
        className="zoom-wrap"
        ref={wrapElRef}
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
          key={imgSrc}
          ref={transformRef}
          minScale={0.1}
          maxScale={20}
          initialScale={1}
          wheel={{ step: 0.15 }}
          doubleClick={{ disabled: true }}
          panning={{ velocityDisabled: true }}
          limitToBounds={false}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => zoomOut()} title="Zoom out">−</button>
                <button onClick={() => dims && fitToViewport(dims.w, dims.h)} title="Reset / fit">⟲</button>
                <button onClick={() => zoomIn()} title="Zoom in">+</button>
              </div>
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
              >
                <img
                  src={imgSrc}
                  alt={filename}
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    setDims({ w, h });
                    fitToViewport(w, h);
                  }}
                  style={{ display: "block", maxWidth: "none", maxHeight: "none" }}
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
      <div className="info" onClick={(e) => e.stopPropagation()}>
        {filename}
        {label ? ` · ${label}` : ""}
        {dims && ` · ${dims.w}×${dims.h} px`}
        <span style={{ marginLeft: 12, color: "var(--muted)", fontSize: 10 }}>
          scroll = zoom · drag = pan · ⟲ = fit
        </span>
      </div>
    </div>
  );
}

function SpeciesView({
  labels,
  groundTruth,
  colorOf,
  speciesPage,
  setSpeciesPage,
  speciesSelection,
  setSpeciesSelection,
  setGroundTruth,
  onLightbox,
}: {
  labels: string[];
  groundTruth: GroundTruth;
  colorOf: (label: string) => string;
  speciesPage: Record<string, number>;
  setSpeciesPage: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  speciesSelection: Set<string>;
  setSpeciesSelection: React.Dispatch<React.SetStateAction<Set<string>>>;
  setGroundTruth: React.Dispatch<React.SetStateAction<GroundTruth>>;
  onLightbox: (filename: string) => void;
}) {
  if (labels.length === 0) {
    return <div className="empty">Cria espécies na sidebar primeiro.</div>;
  }
  const byLabel: Record<string, string[]> = {};
  for (const [fname, lbl] of Object.entries(groundTruth)) {
    if (!byLabel[lbl]) byLabel[lbl] = [];
    byLabel[lbl].push(fname);
  }

  const baseUrl = import.meta.env.BASE_URL || "/";
  const n_sel = speciesSelection.size;

  const removeSelectedLabels = () => {
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const f of speciesSelection) delete next[f];
      return next;
    });
    setSpeciesSelection(new Set());
  };

  return (
    <>
      {n_sel > 0 && (
        <div className="action-bar">
          <div className="count">{n_sel} selecionada(s)</div>
          <button onClick={removeSelectedLabels}>Remover labels da selecção</button>
          <button onClick={() => setSpeciesSelection(new Set())}>Limpar selecção</button>
        </div>
      )}
      {labels.map((lbl) => {
        const files = (byLabel[lbl] ?? []).sort();
        const page = speciesPage[lbl] ?? 0;
        const totalPages = Math.max(1, Math.ceil(files.length / IMAGES_PER_PAGE));
        const effectivePage = Math.min(page, totalPages - 1);
        const pageFiles = files.slice(
          effectivePage * IMAGES_PER_PAGE,
          (effectivePage + 1) * IMAGES_PER_PAGE,
        );
        const allSelected = files.length > 0 && files.every((f) => speciesSelection.has(f));

        return (
          <div className="species-block" key={lbl}>
            <h3>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="swatch" style={{ background: colorOf(lbl) }} />
                <span style={{ color: colorOf(lbl) }}>{lbl}</span>
              </span>
              {files.length > 0 && (
                <button onClick={() => {
                  setSpeciesSelection((prev) => {
                    const next = new Set(prev);
                    if (allSelected) for (const f of files) next.delete(f);
                    else for (const f of files) next.add(f);
                    return next;
                  });
                }}>{allSelected ? "Desselecionar espécie" : "Selecionar espécie"}</button>
              )}
            </h3>
            <div className="meta">{files.length} imagens anotadas</div>
            {files.length === 0 && <div className="hint">Sem imagens ainda.</div>}
            {totalPages > 1 && (
              <Pagination
                page={effectivePage}
                total={totalPages}
                onPage={(n) => setSpeciesPage((prev) => ({ ...prev, [lbl]: n }))}
              />
            )}
            <div className="grid">
              {pageFiles.map((f) => (
                <div
                  key={f}
                  className={`card labeled ${speciesSelection.has(f) ? "selected" : ""}`}
                  style={{ borderColor: colorOf(lbl) }}
                  onClick={() => {
                    setSpeciesSelection((prev) => {
                      const next = new Set(prev);
                      if (next.has(f)) next.delete(f);
                      else next.add(f);
                      return next;
                    });
                  }}
                >
                  <img loading="lazy" src={`${baseUrl}crops/${f}`} alt={f} />
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onLightbox(f)} title="Examinar">🔍</button>
                  </div>
                  <div className="stem">{f.replace(".jpg", "").slice(-22)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
