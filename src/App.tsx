import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONFIG_DEFS, loadConfig } from "./loader";
import {
  exportCSV,
  exportJSON,
  getCloudKey,
  getCloudSavedAt,
  loadColorMap,
  loadGT,
  loadLabels,
  saveColorMap,
  saveGT,
  saveLabels,
  saveToCloud,
  setCloudKey,
  setCloudSavedAt,
} from "./storage";
import { LIXO, LIXO_COLOR, PALETTE } from "./colors";
import type { ConfigData, CropGeometry, GroundTruth } from "./types";
import { TopBar } from "./ui/TopBar";
import { ClusterRail } from "./ui/ClusterRail";
import { SpeciesPanel } from "./ui/SpeciesPanel";
import { Workspace } from "./ui/Workspace";
import { SpeciesView } from "./ui/SpeciesView";
import { Lightbox } from "./ui/Lightbox";
import { ClusterHistory } from "./ui/ClusterHistory";
import { HelpOverlay } from "./ui/HelpOverlay";

const IMAGES_PER_PAGE = 30;
const UNDO_MAX = 30;

type Toast = { id: number; kind: "accent" | "leaf" | "danger"; node: ReactNode; undoable?: boolean };

// fotografia do estado anotável, tirada ANTES de cada mutação (para o Ctrl+Z)
type Snapshot = { gt: GroundTruth; labels: string[]; colors: Record<string, string> };

export default function App() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [configId, setConfigId] = useState("A_microscopio");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groundTruth, setGroundTruth] = useState<GroundTruth>(() => loadGT());
  const [labels, setLabels] = useState<string[]>(() => loadLabels());
  const [colorMap, setColorMap] = useState<Record<string, string>>(() => loadColorMap());

  const [mode, setMode] = useState<"clusters" | "species">("clusters");
  const [currentClusterId, setCurrentClusterId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [speciesSelection, setSpeciesSelection] = useState<Set<string>>(new Set());
  const [activeSpecies, setActiveSpecies] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [speciesPage, setSpeciesPage] = useState<Record<string, number>>({});
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [visited, setVisited] = useState<number[]>([]);
  const [geometry, setGeometry] = useState<CropGeometry>({});
  const [speciesFocus, setSpeciesFocus] = useState<string | null>(null);
  const [cardFocus, setCardFocus] = useState<string | null>(null);

  const [hasCloudKey, setHasCloudKey] = useState(() => !!getCloudKey());
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSavedAt, setCloudSavedAtState] = useState<number | null>(() => getCloudSavedAt());
  const [dirty, setDirty] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // undoable=true: o toast ganha um botão "Desfazer" e dura mais
  const pushToast = useCallback((kind: Toast["kind"], node: ReactNode, undoable = false) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, node, undoable }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undoable ? 5000 : 2800);
  }, []);

  // ---- desfazer (Ctrl+Z) / refazer (Ctrl+Shift+Z) ----
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const gtRef = useRef(groundTruth);
  const labelsRef = useRef(labels);
  const colorsRef = useRef(colorMap);
  useEffect(() => { gtRef.current = groundTruth; }, [groundTruth]);
  useEffect(() => { labelsRef.current = labels; }, [labels]);
  useEffect(() => { colorsRef.current = colorMap; }, [colorMap]);

  const captureState = useCallback(
    (): Snapshot => ({ gt: gtRef.current, labels: labelsRef.current, colors: colorsRef.current }),
    [],
  );

  // tirada ANTES de cada mutação; uma mutação nova invalida o "refazer"
  const snapshot = useCallback(() => {
    undoStack.current.push(captureState());
    if (undoStack.current.length > UNDO_MAX) undoStack.current.shift();
    redoStack.current = [];
  }, [captureState]);

  const restore = useCallback((snap: Snapshot) => {
    setGroundTruth(snap.gt);
    setLabels(snap.labels);
    setColorMap(snap.colors);
    saveColorMap(snap.colors);
    setSelection(new Set());
    setSpeciesSelection(new Set());
  }, []);

  const undo = useCallback(() => {
    const snap = undoStack.current.pop();
    if (!snap) {
      pushToast("danger", <span>Nada para desfazer.</span>);
      return;
    }
    redoStack.current.push(captureState());
    restore(snap);
    pushToast(
      "leaf",
      <>
        <span className="t-icon">↩</span>
        <span>Última ação desfeita</span>
      </>,
    );
  }, [pushToast, captureState, restore]);

  const redo = useCallback(() => {
    const snap = redoStack.current.pop();
    if (!snap) {
      pushToast("danger", <span>Nada para refazer.</span>);
      return;
    }
    undoStack.current.push(captureState());
    restore(snap);
    pushToast(
      "leaf",
      <>
        <span className="t-icon">↪</span>
        <span>Ação refeita</span>
      </>,
    );
  }, [pushToast, captureState, restore]);

  // ---- carregar config (mantém o ground truth, que é partilhado) ----
  useEffect(() => {
    setLoading(true);
    setError(null);
    setVisited([]); // o histórico é por config (ids não são comparáveis entre configs)
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

  // histórico de grupos visitados — mais recente à frente, sem duplicados, limitado
  useEffect(() => {
    if (currentClusterId == null) return;
    setVisited((prev) => [currentClusterId, ...prev.filter((c) => c !== currentClusterId)].slice(0, 6));
  }, [currentClusterId]);

  // ---- persistência local ----
  useEffect(() => { saveGT(groundTruth); }, [groundTruth]);
  useEffect(() => { saveLabels(labels); }, [labels]);

  // marca alterações por enviar para a cloud (ignora o 1º render)
  const firstChange = useRef(true);
  useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    setDirty(true);
  }, [groundTruth, labels]);

  // cor estável (próxima livre na PALETTE) para cada espécie nova
  useEffect(() => {
    const cur = loadColorMap();
    let changed = false;
    for (const l of labels) {
      if (!(l in cur)) {
        cur[l] = PALETTE[Object.keys(cur).length % PALETTE.length];
        changed = true;
      }
    }
    if (changed) {
      saveColorMap(cur);
      setColorMap({ ...cur });
    }
  }, [labels]);

  // a Dra personaliza a cor de uma espécie (palette ou cor livre)
  const setSpeciesColor = useCallback((label: string, hex: string) => {
    setColorMap((prev) => {
      const next = { ...prev, [label]: hex };
      saveColorMap(next);
      return next;
    });
  }, []);

  // geometria dos crops nos originais (vista em detalhe); sem ela o lightbox
  // degrada graciosamente para o crop sozinho
  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";
    fetch(`${base}crop_geometry.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setGeometry)
      .catch(() => setGeometry({}));
  }, []);

  // link mágico (?k=...): guarda a chave e limpa o URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get("k");
    if (k) {
      setCloudKey(k);
      setHasCloudKey(true);
      params.delete("k");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  // mantém activeSpecies válido (o Lixo é sempre válido, apesar de não estar em labels)
  useEffect(() => {
    if (activeSpecies && activeSpecies !== LIXO && !labels.includes(activeSpecies)) setActiveSpecies(labels[0] ?? "");
    else if (!activeSpecies && labels.length > 0) setActiveSpecies(labels[0]);
  }, [labels, activeSpecies]);

  const colorOf = useCallback(
    (label: string): string => (label === LIXO ? LIXO_COLOR : colorMap[label] ?? "#9ca3af"),
    [colorMap],
  );

  // ---- derivados ----
  const allFilenames = useMemo(() => config?.assignments.map((a) => a.filename) ?? [], [config]);
  const totalAnnotated = useMemo(() => allFilenames.filter((f) => groundTruth[f]).length, [allFilenames, groundTruth]);

  // ficheiro -> cluster de origem (na config atual), para saltar do separador Espécies
  const fileToCluster = useMemo(() => {
    const m = new Map<string, number>();
    if (config) for (const a of config.assignments) m.set(a.filename, a.cluster_id);
    return m;
  }, [config]);

  // miniatura representativa por espécie = 1ª imagem anotada (ordem de filename)
  const speciesRep = useMemo(() => {
    const m = new Map<string, string>();
    for (const [f, l] of Object.entries(groundTruth)) {
      const cur = m.get(l);
      if (cur == null || f < cur) m.set(l, f);
    }
    return m;
  }, [groundTruth]);
  const thumbOf = useCallback((label: string): string | null => speciesRep.get(label) ?? null, [speciesRep]);

  const clusterFilenames = useMemo(() => {
    if (!config || currentClusterId == null) return [] as string[];
    return config.byCluster.get(currentClusterId) ?? [];
  }, [config, currentClusterId]);

  // lista em que o lightbox navega com ↑/↓: o cluster atual, ou as imagens da
  // mesma espécie quando aberto a partir da tab de espécies
  const lightboxList = useMemo(() => {
    if (!lightbox) return [] as string[];
    if (mode === "clusters") return clusterFilenames;
    const lbl = groundTruth[lightbox];
    if (!lbl) return [lightbox];
    return Object.keys(groundTruth).filter((f) => groundTruth[f] === lbl).sort();
  }, [lightbox, mode, clusterFilenames, groundTruth]);

  const unannotatedInCluster = useMemo(
    () => clusterFilenames.filter((f) => !groundTruth[f]),
    [clusterFilenames, groundTruth],
  );

  const totalPages = Math.max(1, Math.ceil(unannotatedInCluster.length / IMAGES_PER_PAGE));

  // ---- espécies ----
  const addLabel = useCallback((name: string) => {
    const t = name.trim();
    if (!t) return;
    if (t.toLowerCase() === LIXO.toLowerCase()) {
      alert(`"${LIXO}" é a categoria reservada para crops inutilizáveis — já existe, fixa no fundo do painel.`);
      return;
    }
    setLabels((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setActiveSpecies(t);
  }, []);

  const removeLabel = useCallback((name: string) => {
    if (!confirm(`Remover a espécie "${name}"?\n\nTodas as anotações com esta espécie serão limpas.`)) return;
    snapshot();
    setLabels((prev) => prev.filter((l) => l !== name));
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === name) delete next[k];
      return next;
    });
  }, [snapshot]);

  const renameLabel = useCallback(
    (oldName: string) => {
      const newName = prompt(`Renomear "${oldName}" para:`, oldName)?.trim();
      if (!newName || newName === oldName) return;
      if (labels.includes(newName)) {
        alert("Já existe uma espécie com esse nome.");
        return;
      }
      if (newName.toLowerCase() === LIXO.toLowerCase()) {
        alert(`"${LIXO}" é a categoria reservada para crops inutilizáveis.`);
        return;
      }
      snapshot();
      setLabels((prev) => prev.map((l) => (l === oldName ? newName : l)));
      setGroundTruth((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) if (next[k] === oldName) next[k] = newName;
        return next;
      });
      // a cor segue o nome novo (senão o efeito de auto-cor atribui-lhe uma nova)
      setColorMap((prev) => {
        if (!(oldName in prev)) return prev;
        const next = { ...prev, [newName]: prev[oldName] };
        delete next[oldName];
        saveColorMap(next);
        return next;
      });
      if (activeSpecies === oldName) setActiveSpecies(newName);
    },
    [labels, activeSpecies, snapshot],
  );

  // atribui a selecção atual a uma espécie (usado por A e pelas teclas 1-9)
  const assignSpecies = useCallback(
    (label: string) => {
      if (!label || selection.size === 0) return;
      snapshot();
      const n = selection.size;
      const sel = selection;
      // o cluster fica completo?
      const remaining = unannotatedInCluster.filter((f) => !sel.has(f)).length;
      setGroundTruth((prev) => {
        const next = { ...prev };
        for (const f of sel) next[f] = label;
        return next;
      });
      setSelection(new Set());
      pushToast(
        "accent",
        <>
          <span className="t-sw" style={{ background: colorOf(label) }} />
          <span>
            <b>{n}</b> {n === 1 ? "imagem" : "imagens"} → <b>{label}</b>
          </span>
        </>,
        true,
      );
      if (remaining === 0 && currentClusterId !== -1) {
        setTimeout(
          () =>
            pushToast(
              "leaf",
              <>
                <span className="t-icon">✓</span>
                <span>
                  Grupo concluído! <b>Carrega J</b> para o próximo.
                </span>
              </>,
            ),
          250,
        );
      }
    },
    [selection, unannotatedInCluster, currentClusterId, colorOf, pushToast, snapshot],
  );

  const toggleSelect = useCallback((filename: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }, []);

  const selectPage = useCallback(() => {
    const effPage = Math.min(page, totalPages - 1);
    const pageFiles = unannotatedInCluster.slice(effPage * IMAGES_PER_PAGE, (effPage + 1) * IMAGES_PER_PAGE);
    setSelection((prev) => {
      const next = new Set(prev);
      const all = pageFiles.every((f) => next.has(f));
      if (all) for (const f of pageFiles) next.delete(f);
      else for (const f of pageFiles) next.add(f);
      return next;
    });
  }, [page, totalPages, unannotatedInCluster]);

  // toggle de um conjunto arbitrário (usado pelo "selecionar" por grupo de espécie)
  const toggleMany = useCallback((files: string[]) => {
    setSelection((prev) => {
      const next = new Set(prev);
      const all = files.length > 0 && files.every((f) => next.has(f));
      if (all) for (const f of files) next.delete(f);
      else for (const f of files) next.add(f);
      return next;
    });
  }, []);

  // retirar a etiqueta às imagens selecionadas que estão anotadas (voltam a "por
  // classificar") — correção de erros sem sair do separador Clusters
  const retireSelection = useCallback(() => {
    const labeled = [...selection].filter((f) => groundTruth[f]);
    if (labeled.length === 0) return;
    snapshot();
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const f of labeled) delete next[f];
      return next;
    });
    setSelection(new Set());
    pushToast(
      "danger",
      <>
        <span className="t-icon">⌫</span>
        <span>
          Etiqueta retirada de <b>{labeled.length}</b> {labeled.length === 1 ? "imagem" : "imagens"}
        </span>
      </>,
      true,
    );
  }, [selection, groundTruth, pushToast, snapshot]);

  const navCluster = useCallback(
    (dir: 1 | -1) => {
      if (!config || currentClusterId == null) return;
      const i = config.clusterIds.indexOf(currentClusterId);
      const len = config.clusterIds.length;
      const next = config.clusterIds[(i + dir + len) % len];
      setCurrentClusterId(next);
      setPage(0);
      setSelection(new Set());
    },
    [config, currentClusterId],
  );

  const selectCluster = useCallback((cid: number) => {
    setCurrentClusterId(cid);
    setPage(0);
    setSelection(new Set());
    setMode("clusters");
  }, []);

  // arrastar-e-largar (painel direito E blocos da tab Espécies): move `label`
  // para a posição de `target` — a ordem é a mesma em todo o lado (atalhos 1-9 incl.)
  const reorderLabel = useCallback((label: string, target: string) => {
    setLabels((prev) => {
      const i = prev.indexOf(label);
      const j = prev.indexOf(target);
      if (i < 0 || j < 0 || i === j) return prev;
      const next = [...prev];
      next.splice(i, 1);
      next.splice(j, 0, label);
      return next;
    });
  }, []);

  // clicar numa espécie no painel direito → ir para a tab Espécies e focar nela
  const goToSpecies = useCallback((label: string) => {
    setActiveSpecies(label);
    setMode("species");
    setSpeciesFocus(label);
  }, []);

  // saltar de uma imagem (separador Espécies / lightbox) para o seu grupo de origem
  const goToSourceCluster = useCallback(
    (filename: string) => {
      const cid = fileToCluster.get(filename);
      if (cid != null) {
        setLightbox(null);
        setShowAnnotated(true); // a imagem anotada tem de estar visível no grupo
        selectCluster(cid);
        setCardFocus(filename); // o Workspace faz scroll + realce
      }
    },
    [fileToCluster, selectCluster],
  );

  // ---- import / cloud ----
  const handleImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          snapshot(); // importar substitui tudo — tem de ser desfazível
          if (data.ground_truth && typeof data.ground_truth === "object") setGroundTruth(data.ground_truth);
          if (Array.isArray(data.labels)) setLabels(data.labels);
          pushToast(
            "leaf",
            <>
              <span className="t-icon">↻</span>
              <span>
                Importado: <b>{Object.keys(data.ground_truth ?? {}).length}</b> anotações,{" "}
                <b>{(data.labels ?? []).length}</b> espécies
              </span>
            </>,
          );
        } catch (err) {
          pushToast("danger", <span>Erro a importar: {String(err)}</span>);
        }
      };
      reader.readAsText(file);
    },
    [pushToast, snapshot],
  );

  const handleCloudSave = useCallback(async () => {
    setCloudSaving(true);
    const r = await saveToCloud(groundTruth, labels, allFilenames);
    setCloudSaving(false);
    if (r.ok) {
      const ts = Date.now();
      setCloudSavedAt(ts);
      setCloudSavedAtState(ts);
      setDirty(false);
      pushToast(
        "leaf",
        <>
          <span className="t-icon">☁</span>
          <span>
            Guardado na cloud · <b>{r.count}</b> anotações
          </span>
        </>,
      );
    } else {
      pushToast("danger", <span>{r.error}</span>);
    }
  }, [groundTruth, labels, allFilenames, pushToast]);

  // remover labels (vista Espécies) — antes dos atalhos, que dependem dela
  const removeSelectedLabels = useCallback(() => {
    const n = speciesSelection.size;
    if (n === 0) return;
    snapshot();
    setGroundTruth((prev) => {
      const next = { ...prev };
      for (const f of speciesSelection) delete next[f];
      return next;
    });
    setSpeciesSelection(new Set());
    pushToast("danger", <span>Etiqueta removida de <b>{n}</b> {n === 1 ? "imagem" : "imagens"}</span>, true);
  }, [speciesSelection, pushToast, snapshot]);

  // ---- atalhos de teclado ----
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (lightbox) {
        // ↑/↓ alternam as vistas (geridas no Lightbox); aqui: navegar e selecionar
        if (e.key === "Escape") setLightbox(null);
        else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const i = lightboxList.indexOf(lightbox);
          if (i >= 0 && lightboxList.length > 1) {
            const step = e.key === "ArrowRight" ? 1 : -1;
            setLightbox(lightboxList[(i + step + lightboxList.length) % lightboxList.length]);
          }
        } else if (e.key === "s" || e.key === "S") {
          // seleciona/desseleciona a plântula em vista sem fechar o viewport
          if (mode === "clusters") toggleSelect(lightbox);
          else
            setSpeciesSelection((prev) => {
              const next = new Set(prev);
              if (next.has(lightbox)) next.delete(lightbox);
              else next.add(lightbox);
              return next;
            });
        }
        return;
      }
      if (helpOpen) {
        if (e.key === "Escape" || e.key === "?") setHelpOpen(false);
        return;
      }
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;

      // funcionam em qualquer separador
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "?") {
        setHelpOpen(true);
        return;
      }
      if (e.key === "Escape") {
        // desseleciona tudo (em ambos os separadores)
        setSelection(new Set());
        setSpeciesSelection(new Set());
        return;
      }

      if (mode === "species") {
        if (e.key === "r" || e.key === "R") removeSelectedLabels();
        return;
      }
      if (mode !== "clusters" || !config) return;

      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setPage((p) => Math.min(totalPages - 1, p + 1));
      else if (e.key === "a" || e.key === "A") assignSpecies(activeSpecies);
      else if (e.key === "d" || e.key === "D") setSelection(new Set());
      else if (e.key === "r" || e.key === "R") retireSelection();
      else if (e.key === "j" || e.key === "J") navCluster(1);
      else if (e.key === "k" || e.key === "K") navCluster(-1);
      else if (e.key === "0") {
        // categoria Lixo: com selecção atribui logo; sem selecção fica ativa
        if (selection.size > 0) assignSpecies(LIXO);
        else setActiveSpecies(LIXO);
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < labels.length) {
          const lbl = labels[idx];
          if (selection.size > 0) assignSpecies(lbl);
          else setActiveSpecies(lbl);
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, config, lightbox, lightboxList, helpOpen, totalPages, assignSpecies, activeSpecies, navCluster, labels, selection, retireSelection, removeSelectedLabels, toggleSelect, undo, redo]);

  // reatribuir a selecção (vista Espécies) a outra espécie
  const reassignSpeciesSelection = useCallback(
    (label: string) => {
      if (!label || speciesSelection.size === 0) return;
      snapshot();
      const n = speciesSelection.size;
      setGroundTruth((prev) => {
        const next = { ...prev };
        for (const f of speciesSelection) next[f] = label;
        return next;
      });
      setSpeciesSelection(new Set());
      pushToast(
        "accent",
        <>
          <span className="t-sw" style={{ background: colorOf(label) }} />
          <span>
            <b>{n}</b> {n === 1 ? "imagem" : "imagens"} → <b>{label}</b>
          </span>
        </>,
        true,
      );
    },
    [speciesSelection, colorOf, pushToast, snapshot],
  );

  if (loading || !config) {
    return (
      <div className="loading-screen">
        <div className="ls-inner">{error ? `Erro: ${error}` : "A carregar…"}</div>
      </div>
    );
  }

  const nClusters = config.clusterIds.filter((c) => c !== -1).length;
  const nNoise = config.byCluster.get(-1)?.length ?? 0;
  const currentMetrics = currentClusterId != null ? config.metrics.get(currentClusterId) ?? null : null;
  const cloudState: "synced" | "pending" | "none" = !hasCloudKey
    ? "none"
    : dirty || !cloudSavedAt
      ? "pending"
      : "synced";

  return (
    <div className="app">
      <TopBar
        defs={CONFIG_DEFS}
        configId={configId}
        onConfig={setConfigId}
        nClusters={nClusters}
        nNoise={nNoise}
        totalAnnotated={totalAnnotated}
        totalAll={allFilenames.length}
        cloudState={cloudState}
        cloudSaving={cloudSaving}
        onCloudSave={handleCloudSave}
        onExportJSON={() => exportJSON(groundTruth, labels)}
        onExportCSV={() => exportCSV(groundTruth, allFilenames)}
        onImport={handleImport}
        onHelp={() => setHelpOpen(true)}
      />

      <ClusterRail
        config={config}
        groundTruth={groundTruth}
        currentClusterId={currentClusterId}
        onSelect={selectCluster}
      />

      <main className="work">
        <div className="work-top">
          <div className="mode-switch">
            <button className={mode === "clusters" ? "on" : ""} onClick={() => setMode("clusters")}>
              Clusters
            </button>
            <button className={mode === "species" ? "on" : ""} onClick={() => setMode("species")}>
              Espécies
            </button>
          </div>
          <div className="spacer" />
          {mode === "clusters" && (
            <ClusterHistory
              visited={visited}
              config={config}
              groundTruth={groundTruth}
              currentClusterId={currentClusterId}
              onSelect={selectCluster}
            />
          )}
        </div>

        {mode === "clusters" && currentClusterId != null ? (
          <Workspace
            clusterId={currentClusterId}
            metrics={currentMetrics}
            clusterFilenames={clusterFilenames}
            unannotated={unannotatedInCluster}
            groundTruth={groundTruth}
            page={page}
            onPage={setPage}
            selection={selection}
            showAnnotated={showAnnotated}
            onToggleShowAnnotated={setShowAnnotated}
            labels={labels}
            activeSpecies={activeSpecies}
            colorOf={colorOf}
            thumbOf={thumbOf}
            onSetActive={setActiveSpecies}
            onToggleSelect={toggleSelect}
            onOpenLightbox={setLightbox}
            onAssign={() => assignSpecies(activeSpecies)}
            onSelectPage={selectPage}
            onToggleMany={toggleMany}
            onRetire={retireSelection}
            onClear={() => setSelection(new Set())}
            onSelectCluster={selectCluster}
            focusFile={cardFocus}
            onFocusHandled={() => setCardFocus(null)}
          />
        ) : (
          <SpeciesView
            labels={[...labels, LIXO]}
            groundTruth={groundTruth}
            colorOf={colorOf}
            speciesPage={speciesPage}
            setSpeciesPage={setSpeciesPage}
            selection={speciesSelection}
            setSelection={setSpeciesSelection}
            onRemoveLabels={removeSelectedLabels}
            onReassign={reassignSpeciesSelection}
            onOpenLightbox={setLightbox}
            onRename={renameLabel}
            onRemove={removeLabel}
            onSetColor={setSpeciesColor}
            thumbOf={thumbOf}
            clusterOf={(f) => fileToCluster.get(f) ?? null}
            onGoToCluster={goToSourceCluster}
            onOpenCluster={selectCluster}
            focus={speciesFocus}
            onFocusHandled={() => setSpeciesFocus(null)}
          />
        )}
      </main>

      <SpeciesPanel
        labels={labels}
        groundTruth={groundTruth}
        colorOf={colorOf}
        thumbOf={thumbOf}
        activeSpecies={activeSpecies}
        onGoToSpecies={goToSpecies}
        onAdd={addLabel}
        onRename={renameLabel}
        onReorder={reorderLabel}
        onSetColor={setSpeciesColor}
      />

      <Lightbox
        filename={lightbox}
        geo={lightbox ? geometry[lightbox] ?? null : null}
        selected={
          lightbox ? (mode === "clusters" ? selection.has(lightbox) : speciesSelection.has(lightbox)) : false
        }
        label={lightbox ? groundTruth[lightbox] : undefined}
        color={lightbox && groundTruth[lightbox] ? colorOf(groundTruth[lightbox]) : undefined}
        clusterId={lightbox ? fileToCluster.get(lightbox) : undefined}
        onGoToCluster={lightbox ? () => goToSourceCluster(lightbox) : undefined}
        onClose={() => setLightbox(null)}
      />

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}

      <div className="toaster">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.node}
            {t.undoable && (
              <button
                className="t-undo"
                onClick={() => {
                  setToasts((cur) => cur.filter((x) => x.id !== t.id));
                  undo();
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
