import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONFIG_DEFS, loadConfig } from "./loader";
import {
  exportCSV,
  exportJSON,
  getCloudKey,
  getCloudSavedAt,
  getNovidadeVista,
  loadColorMap,
  loadEppoMap,
  loadFamilyMap,
  loadFromCloud,
  loadRankMap,
  loadGT,
  loadLabels,
  saveColorMap,
  saveEppoMap,
  saveFamilyMap,
  saveGT,
  saveRankMap,
  saveLabels,
  saveToCloud,
  setCloudKey,
  setCloudSavedAt,
  setNovidadeVista,
} from "./storage";
import { ULTIMA_NOVIDADE } from "./novidades";
import { loadEppo, type EppoEntry } from "./eppo";
import { celebrateAssign } from "./ui/particles";
import {
  A_CONFIRMAR, A_CONFIRMAR_COLOR, CID_LIXO, isPilha, isReservada,
  LIXO, LIXO_COLOR, PALETTE, pilhaLabel, RESERVADAS,
} from "./colors";
import type { ConfigData, CropGeometry, GroundTruth } from "./types";
import { TopBar } from "./ui/TopBar";
import { ClusterRail } from "./ui/ClusterRail";
import { SpeciesPanel } from "./ui/SpeciesPanel";
import { Workspace } from "./ui/Workspace";
import { SpeciesView } from "./ui/SpeciesView";
import { Lightbox } from "./ui/Lightbox";
import { ClusterHistory } from "./ui/ClusterHistory";
import { HelpOverlay } from "./ui/HelpOverlay";
import { Novidades } from "./ui/Novidades";
import { BinFlutuante } from "./ui/BinFlutuante";

const IMAGES_PER_PAGE = 30;
const UNDO_MAX = 30;

type Toast = { id: number; kind: "accent" | "leaf" | "danger"; node: ReactNode; undoable?: boolean };

// fotografia do estado anotável, tirada ANTES de cada mutação (para o Ctrl+Z)
type Snapshot = {
  gt: GroundTruth;
  labels: string[];
  colors: Record<string, string>;
  eppo: Record<string, string>;
  family: Record<string, string>;
  rank: Record<string, string>;
};

// forma do ground_truth.json (export/cloud) — campos todos opcionais na leitura
type CloudPayload = {
  ground_truth?: GroundTruth;
  labels?: string[];
  eppo?: Record<string, string>;
  family?: Record<string, string>;
  rank?: Record<string, string>;
  exported_at?: string;
};

export default function App() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [configId, setConfigId] = useState("A_microscopio");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groundTruth, setGroundTruth] = useState<GroundTruth>(() => loadGT());
  const [labels, setLabels] = useState<string[]>(() => loadLabels());
  const [colorMap, setColorMap] = useState<Record<string, string>>(() => loadColorMap());
  const [eppoMap, setEppoMap] = useState<Record<string, string>>(() => loadEppoMap());
  const [familyMap, setFamilyMap] = useState<Record<string, string>>(() => loadFamilyMap());
  const [rankMap, setRankMap] = useState<Record<string, string>>(() => loadRankMap());
  const [eppoVocab, setEppoVocab] = useState<EppoEntry[]>([]);

  const [mode, setMode] = useState<"clusters" | "species">("clusters");
  const [currentClusterId, setCurrentClusterId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  // cartões atribuídos mas ainda a "voar": escondidos (mantêm o espaço) até a
  // remoção atrasada, para a grelha "Por classificar" não saltar de imediato
  const [flying, setFlying] = useState<Set<string>>(new Set());
  const [speciesSelection, setSpeciesSelection] = useState<Set<string>>(new Set());
  const [activeSpecies, setActiveSpecies] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  // secção de onde o viewport foi aberto ("Por classificar", um grupo de espécie,
  // o Lixo, uma ficha da Coleção). É ela que define a ordem do ←/→ — abrir a
  // partir de "Por classificar" NÃO deve passar pelas já etiquetadas. Captura-se
  // no momento da abertura para a lista não fugir por baixo dos pés ao anotar.
  const [lightboxScope, setLightboxScope] = useState<string[] | null>(null);
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
  // a cloud tem versão mais recente que a local (editada noutro dispositivo) —
  // mostra um aviso com botão de carregar (não sobrepõe automaticamente)
  const [cloudAhead, setCloudAhead] = useState<{ data: CloudPayload; at: number } | null>(null);

  const [helpOpen, setHelpOpen] = useState(false);

  // ---- novidades ----
  // Decide-se UMA vez, no arranque, antes de o utilizador poder mexer em nada:
  //   marcador igual ao mais recente  -> já viu, nada a anunciar
  //   sem marcador MAS com trabalho   -> andava a anotar antes disto existir; é
  //                                      exactamente a pessoa a quem interessa
  //   sem marcador e sem trabalho     -> primeira visita, um alerta seria ruído
  const [novidadesOpen, setNovidadesOpen] = useState(false);
  const [novidadesPorLer, setNovidadesPorLer] = useState(() => {
    const vista = getNovidadeVista();
    if (vista) return vista < ULTIMA_NOVIDADE;
    return Object.keys(loadGT()).length > 0 || loadLabels().length > 0;
  });
  // primeira visita: marcar como visto em silêncio, para não acender no arranque
  // seguinte só porque nunca ninguém abriu a página
  useEffect(() => {
    if (!novidadesPorLer && !getNovidadeVista()) setNovidadeVista(ULTIMA_NOVIDADE);
  }, [novidadesPorLer]);

  const abrirNovidades = useCallback(() => {
    setNovidadesOpen(true);
    setNovidadesPorLer(false);
    setNovidadeVista(ULTIMA_NOVIDADE);
  }, []);

  // #novidades no endereço abre a página directamente — é este o link que segue
  // nos emails para quem anota.
  // O `hashchange` NÃO é zelo a mais: se o separador já estiver aberto, clicar no
  // link do email muda o hash sem recarregar a página, e sem isto não acontecia
  // nada — que é precisamente o caso de quem anda a anotar todos os dias.
  useEffect(() => {
    const abrirSeForCaso = () => {
      if (window.location.hash.toLowerCase() !== "#novidades") return;
      abrirNovidades();
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
    };
    abrirSeForCaso();
    window.addEventListener("hashchange", abrirSeForCaso);
    return () => window.removeEventListener("hashchange", abrirSeForCaso);
  }, [abrirNovidades]);

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
  const eppoRef = useRef(eppoMap);
  const familyRef = useRef(familyMap);
  const rankRef = useRef(rankMap);
  useEffect(() => { gtRef.current = groundTruth; }, [groundTruth]);
  useEffect(() => { labelsRef.current = labels; }, [labels]);
  useEffect(() => { colorsRef.current = colorMap; }, [colorMap]);
  useEffect(() => { eppoRef.current = eppoMap; }, [eppoMap]);
  useEffect(() => { familyRef.current = familyMap; }, [familyMap]);
  useEffect(() => { rankRef.current = rankMap; }, [rankMap]);

  const captureState = useCallback(
    (): Snapshot => ({
      gt: gtRef.current,
      labels: labelsRef.current,
      colors: colorsRef.current,
      eppo: eppoRef.current,
      family: familyRef.current,
      rank: rankRef.current,
    }),
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
    setEppoMap(snap.eppo);
    saveEppoMap(snap.eppo);
    setFamilyMap(snap.family);
    saveFamilyMap(snap.family);
    setRankMap(snap.rank);
    saveRankMap(snap.rank);
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

  // vocabulário EPPO (offline, curado) para o autocomplete ao criar/editar espécie
  useEffect(() => { loadEppo().then(setEppoVocab); }, []);

  // ---- persistência local ----
  useEffect(() => { saveGT(groundTruth); }, [groundTruth]);
  useEffect(() => { saveLabels(labels); }, [labels]);
  useEffect(() => { saveEppoMap(eppoMap); }, [eppoMap]);
  useEffect(() => { saveFamilyMap(familyMap); }, [familyMap]);
  useEffect(() => { saveRankMap(rankMap); }, [rankMap]);

  // marca alterações por enviar para a cloud (ignora o 1º render). skipDirty é
  // ligado por applyCloud: carregar da cloud NÃO conta como alteração por enviar.
  const firstChange = useRef(true);
  const skipDirty = useRef(false);
  useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    if (skipDirty.current) {
      skipDirty.current = false;
      return;
    }
    setDirty(true);
  }, [groundTruth, labels, eppoMap, familyMap]);

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

  // mantém activeSpecies válido (as reservadas são sempre válidas, apesar de não
  // estarem em labels)
  useEffect(() => {
    if (activeSpecies && !isReservada(activeSpecies) && !labels.includes(activeSpecies)) {
      setActiveSpecies(labels[0] ?? "");
    } else if (!activeSpecies && labels.length > 0) setActiveSpecies(labels[0]);
  }, [labels, activeSpecies]);

  const colorOf = useCallback(
    (label: string): string => {
      if (label === LIXO) return LIXO_COLOR;
      if (label === A_CONFIRMAR) return A_CONFIRMAR_COLOR;
      return colorMap[label] ?? "#9ca3af";
    },
    [colorMap],
  );

  /** Nível taxonómico de uma etiqueta: "especie" (omissão) ou "familia". */
  const rankOf = useCallback(
    (label: string): string => rankMap[label] || "especie",
    [rankMap],
  );

  // (o nível edita-se pelo lápis, via editSpecies — um só snapshot por edição,
  // logo um só Ctrl+Z desfaz nome + código + família + nível de uma vez)

  // ---- derivados ----
  const allFilenames = useMemo(() => config?.assignments.map((a) => a.filename) ?? [], [config]);
  const totalAnnotated = useMemo(() => allFilenames.filter((f) => groundTruth[f]).length, [allFilenames, groundTruth]);

  // quantas imagens tem cada etiqueta — a linha de família usa a segunda linha
  // para isto (a de espécie usa-a para o código EPPO, que a família não tem)
  const countByLabel = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of Object.values(groundTruth)) m.set(l, (m.get(l) ?? 0) + 1);
    return m;
  }, [groundTruth]);
  // tamanho das duas pilhas — o rail e o caixote flutuante mostram-nos
  const nConfirmar = countByLabel.get(A_CONFIRMAR) ?? 0;
  const nLixo = countByLabel.get(LIXO) ?? 0;

  // ficheiro -> cluster de origem (na config atual), para saltar do separador Espécies
  const fileToCluster = useMemo(() => {
    const m = new Map<string, number>();
    if (config) for (const a of config.assignments) m.set(a.filename, a.cluster_id);
    return m;
  }, [config]);

  // miniatura representativa por espécie = crop anotado de MAIOR área (mais
  // resolução = planta mais legível). Área vem do crop_geometry (w·h, espaço de
  // exibição). Sem geometria, desempata por ordem de filename (comportamento antigo).
  const speciesRep = useMemo(() => {
    const best = new Map<string, { f: string; area: number }>();
    for (const [f, l] of Object.entries(groundTruth)) {
      const g = geometry[f];
      const area = g ? g.w * g.h : 0;
      const cur = best.get(l);
      if (!cur || area > cur.area || (area === cur.area && f < cur.f)) best.set(l, { f, area });
    }
    const m = new Map<string, string>();
    for (const [l, v] of best) m.set(l, v.f);
    return m;
  }, [groundTruth, geometry]);
  const thumbOf = useCallback((label: string): string | null => speciesRep.get(label) ?? null, [speciesRep]);

  // família botânica de uma espécie, via código EPPO -> vocabulário (para a Coleção)
  const eppoByCode = useMemo(() => {
    const m = new Map<string, EppoEntry>();
    for (const e of eppoVocab) m.set(e.code, e);
    return m;
  }, [eppoVocab]);
  const familyOf = useCallback(
    (label: string): string => {
      // override manual primeiro; senão deriva do código via vocabulário
      if (familyMap[label]) return familyMap[label];
      const code = eppoMap[label];
      return (code ? eppoByCode.get(code)?.family : "") ?? "";
    },
    [familyMap, eppoMap, eppoByCode],
  );

  // Numa pilha ("A confirmar" / "Lixo") o conjunto de trabalho não vem do
  // clustering: são todas as imagens com aquela etiqueta, venham do grupo que
  // vierem. Ordenadas pelo cluster de origem, porque plântulas do mesmo grupo
  // são provavelmente a mesma espécie — resolver uma resolve várias.
  const clusterFilenames = useMemo(() => {
    if (!config || currentClusterId == null) return [] as string[];
    if (isPilha(currentClusterId)) {
      const alvo = pilhaLabel(currentClusterId);
      return Object.keys(groundTruth)
        .filter((f) => groundTruth[f] === alvo)
        .sort((a, b) => (fileToCluster.get(a) ?? 1e9) - (fileToCluster.get(b) ?? 1e9) || a.localeCompare(b));
    }
    return config.byCluster.get(currentClusterId) ?? [];
  }, [config, currentClusterId, groundTruth, fileToCluster]);

  // lista em que o lightbox navega com ←/→: a secção de onde foi aberto. Sem
  // secção (aberturas antigas/indirectas) cai no cluster atual ou nas imagens da
  // mesma espécie, como antes.
  const lightboxList = useMemo(() => {
    if (!lightbox) return [] as string[];
    if (lightboxScope && lightboxScope.includes(lightbox)) return lightboxScope;
    if (mode === "clusters") return clusterFilenames;
    const lbl = groundTruth[lightbox];
    if (!lbl) return [lightbox];
    return Object.keys(groundTruth).filter((f) => groundTruth[f] === lbl).sort();
  }, [lightbox, lightboxScope, mode, clusterFilenames, groundTruth]);

  // abrir o viewport a partir de uma secção concreta (a lista fica congelada)
  const openLightbox = useCallback((f: string, scope?: string[]) => {
    setLightboxScope(scope ? [...scope] : null);
    setLightbox(f);
  }, []);

  // O que está "por trabalhar" na vista actual. Num cluster são as que ainda não
  // têm etiqueta; numa pilha são TODAS — já têm etiqueta, mas é precisamente essa
  // que se vem cá substituir.
  const unannotatedInCluster = useMemo(
    () =>
      isPilha(currentClusterId)
        ? clusterFilenames
        : clusterFilenames.filter((f) => !groundTruth[f]),
    [clusterFilenames, groundTruth, currentClusterId],
  );

  const totalPages = Math.max(1, Math.ceil(unannotatedInCluster.length / IMAGES_PER_PAGE));

  // ---- espécies ----
  // criação centralizada: nome + código + família (todos opcionais menos o nome)
  const addLabel = useCallback((name: string, code?: string, family?: string, rank?: string) => {
    const t = name.trim();
    if (!t) return;
    if (isReservada(t) || RESERVADAS.some((r) => r.toLowerCase() === t.toLowerCase())) {
      alert(`"${t}" é uma categoria reservada — já existe, fixa no fundo do painel.`);
      return;
    }
    setLabels((prev) => (prev.includes(t) ? prev : [...prev, t]));
    if (code) setEppoMap((prev) => ({ ...prev, [t]: code }));
    if (family) setFamilyMap((prev) => ({ ...prev, [t]: family }));
    if (rank === "familia") setRankMap((prev) => ({ ...prev, [t]: "familia" }));
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

  // Edição CENTRALIZADA de uma espécie (lápis): nome + código EPPO + família de uma
  // só vez. Um único snapshot -> um Ctrl+Z desfaz a edição toda. O nome é a chave
  // das anotações, por isso mudá-lo arrasta ground truth, cor, código e família.
  const editSpecies = useCallback(
    (oldName: string, proposed: string, code: string, family: string, rank: string) => {
      const newName = proposed.trim();
      if (!newName) return;
      if (newName !== oldName) {
        if (labels.includes(newName)) {
          alert("Já existe uma espécie com esse nome.");
          return;
        }
        if (RESERVADAS.some((r) => r.toLowerCase() === newName.toLowerCase())) {
          alert(`"${newName}" é uma categoria reservada.`);
          return;
        }
      }
      snapshot();
      setRankMap((prev) => {
        const next = { ...prev };
        delete next[oldName];
        if (rank === "familia") next[newName] = "familia";
        else delete next[newName];
        return next;
      });
      setEppoMap((prev) => {
        const next = { ...prev };
        delete next[oldName];
        if (code) next[newName] = code;
        else delete next[newName];
        return next;
      });
      setFamilyMap((prev) => {
        const next = { ...prev };
        delete next[oldName];
        if (family) next[newName] = family;
        else delete next[newName];
        return next;
      });
      if (newName === oldName) return;
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
      // (código EPPO, família e nível já foram gravados no nome novo acima)
      if (activeSpecies === oldName) setActiveSpecies(newName);
    },
    [labels, activeSpecies, snapshot],
  );

  // atribui a selecção atual a uma espécie (usado por A e pelas teclas 1-9)
  const assignSpecies = useCallback(
    (label: string) => {
      if (!label || selection.size === 0) return;
      snapshot();
      const sel = new Set(selection);
      const n = sel.size;
      // partículas a voar da selecção até à espécie no painel direito (escala com n).
      // Calculado AGORA (DOM ainda com os cartões selecionados, antes do re-render).
      celebrateAssign({
        files: sel,
        label,
        color: label === LIXO ? "#e75d74" : colorOf(label),
        n,
        fallbackSelector: ".species-panel .sp-head",
      });
      // o cluster fica completo?
      const remaining = unannotatedInCluster.filter((f) => !sel.has(f)).length;
      setSelection(new Set());
      // esconde já os atribuídos (mantendo o espaço) e remove ~700ms depois — a
      // grelha "Por classificar" só reflui no fim, para não saltar enquanto voam
      setFlying((prev) => new Set([...prev, ...sel]));
      window.setTimeout(() => {
        setGroundTruth((prev) => {
          const next = { ...prev };
          for (const f of sel) next[f] = label;
          return next;
        });
        setFlying((prev) => {
          const nx = new Set(prev);
          for (const f of sel) nx.delete(f);
          return nx;
        });
      }, 700);
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
      // numa pilha isto dispararia sempre (todas as imagens contam como "por
      // trabalhar"), e "grupo concluído" ali não quer dizer nada
      if (remaining === 0 && currentClusterId !== -1 && !isPilha(currentClusterId)) {
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

  // pintar a selecção em bloco (arrastamento na grelha): FORÇA o estado em vez de
  // alternar — quem manda é o cartão de partida, senão um arrastamento sobre
  // cartões em estados diferentes deixava-os todos trocados.
  const paintSelect = useCallback((files: string[], on: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const f of files) {
        if (on) next.add(f);
        else next.delete(f);
      }
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
          // mapas EPPO/família são opcionais (ficheiros antigos não os têm)
          if (data.eppo && typeof data.eppo === "object") setEppoMap(data.eppo);
          if (data.family && typeof data.family === "object") setFamilyMap(data.family);
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

  // `silent` (autosave): sem toasts — o indicador synced/pending dá o feedback;
  // só o save manual (botão) anuncia sucesso/erro.
  const doCloudSave = useCallback(
    async (silent: boolean) => {
      setCloudSaving(true);
      const r = await saveToCloud(groundTruth, labels, allFilenames, eppoMap, familyMap, rankMap);
      setCloudSaving(false);
      if (r.ok) {
        const ts = Date.now();
        setCloudSavedAt(ts);
        setCloudSavedAtState(ts);
        setDirty(false);
        if (!silent)
          pushToast(
            "leaf",
            <>
              <span className="t-icon">☁</span>
              <span>
                Guardado na cloud · <b>{r.count}</b> anotações
              </span>
            </>,
          );
      } else if (!silent) {
        pushToast("danger", <span>{r.error}</span>);
      }
    },
    [groundTruth, labels, allFilenames, eppoMap, familyMap, pushToast],
  );

  const handleCloudSave = useCallback(() => doCloudSave(false), [doCloudSave]);

  // aplica um payload vindo da cloud ao estado local (desfazível; NÃO marca dirty,
  // porque o estado passa a coincidir com a cloud). `at` = exported_at da cloud.
  const applyCloud = useCallback((data: CloudPayload, at: number) => {
    snapshot();
    skipDirty.current = true;
    if (data.ground_truth && typeof data.ground_truth === "object") setGroundTruth(data.ground_truth);
    if (Array.isArray(data.labels)) setLabels(data.labels);
    if (data.eppo && typeof data.eppo === "object") setEppoMap(data.eppo);
    if (data.family && typeof data.family === "object") setFamilyMap(data.family);
    if (data.rank && typeof data.rank === "object") setRankMap(data.rank);
    if (at) {
      setCloudSavedAt(at);
      setCloudSavedAtState(at);
    }
    setDirty(false);
  }, [snapshot]);

  // ---- arranque: puxar da cloud (uma vez) ----
  // dispositivo novo (local vazio) -> carrega automaticamente; já com trabalho
  // local -> só avisa se a cloud for mais recente (botão explícito, sem clobber).
  const cloudPulled = useRef(false);
  useEffect(() => {
    if (cloudPulled.current || !hasCloudKey) return;
    cloudPulled.current = true;
    loadFromCloud().then((r) => {
      if (!r.ok || !r.json) return;
      let parsed: CloudPayload;
      try {
        parsed = JSON.parse(r.json) as CloudPayload;
      } catch {
        return;
      }
      const at = parsed.exported_at ? Date.parse(parsed.exported_at) || 0 : 0;
      const localEmpty =
        Object.keys(gtRef.current).length === 0 && labelsRef.current.length === 0;
      if (localEmpty) {
        applyCloud(parsed, at);
        pushToast(
          "leaf",
          <>
            <span className="t-icon">☁</span>
            <span>
              Carregado da cloud · <b>{Object.keys(parsed.ground_truth ?? {}).length}</b> anotações
            </span>
          </>,
        );
      } else if (at > (getCloudSavedAt() ?? 0)) {
        setCloudAhead({ data: parsed, at });
      }
    });
  }, [hasCloudKey, applyCloud, pushToast]);

  // ---- autosave para a cloud (silencioso) ----
  // refs com a versão mais recente, para os efeitos não dependerem dos handlers
  const saveRef = useRef(doCloudSave);
  const dirtyRef = useRef(dirty);
  // enquanto o banner "cloud mais recente" está pendente, NÃO autosave — senão o
  // estado local empurrava-se por cima da versão da cloud antes de o utilizador decidir
  const blockAuto = useRef(false);
  useEffect(() => { saveRef.current = doCloudSave; }, [doCloudSave]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { blockAuto.current = cloudAhead != null; }, [cloudAhead]);

  // debounce: guarda 20s depois da ÚLTIMA alteração (coalesce rajadas de anotação).
  // O efeito re-corre a cada mudança enquanto dirty, reiniciando o temporizador.
  useEffect(() => {
    if (!hasCloudKey || !dirty || cloudSaving || cloudAhead) return;
    const t = setTimeout(() => saveRef.current(true), 20000);
    return () => clearTimeout(t);
  }, [hasCloudKey, dirty, cloudSaving, cloudAhead, groundTruth, labels, eppoMap]);

  // flush imediato quando o separador é escondido/fechado (best-effort em fecho
  // forçado; fiável ao trocar de separador/minimizar)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current && hasCloudKey && !blockAuto.current) {
        saveRef.current(true);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [hasCloudKey]);

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

  // última posição do rato: é o alvo da tecla S quando o viewport está fechado
  const rato = useRef({ x: -1, y: -1 });
  useEffect(() => {
    const h = (e: PointerEvent) => {
      rato.current.x = e.clientX;
      rato.current.y = e.clientY;
    };
    window.addEventListener("pointermove", h, { passive: true });
    return () => window.removeEventListener("pointermove", h);
  }, []);

  // tecla S na grelha: alterna a plântula que está DEBAIXO DO RATO, sem clicar.
  // É o mesmo S do viewport — lá atua sobre a imagem em vista, aqui sobre a que
  // se está a olhar. Percorrer a grelha com o rato e ir carregando em S é o
  // caminho mais rápido para juntar uma selecção.
  const toggleHovered = useCallback(() => {
    const { x, y } = rato.current;
    if (x < 0) return;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const f = el?.closest("[data-file]")?.getAttribute("data-file");
    if (!f) return;
    if (mode === "clusters") {
      toggleSelect(f);
      return;
    }
    setSpeciesSelection((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }, [mode, toggleSelect]);

  // seleciona/desseleciona a plântula em vista no viewport (tecla S e a caixa de
  // seleção da ficha) — o alvo depende do separador em que estamos
  const toggleLightboxSelect = useCallback(() => {
    if (!lightbox) return;
    if (mode === "clusters") toggleSelect(lightbox);
    else
      setSpeciesSelection((prev) => {
        const next = new Set(prev);
        if (next.has(lightbox)) next.delete(lightbox);
        else next.add(lightbox);
        return next;
      });
  }, [lightbox, mode, toggleSelect]);

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
          toggleLightboxSelect();
        }
        return;
      }
      if (helpOpen) {
        if (e.key === "Escape" || e.key === "?") setHelpOpen(false);
        return;
      }
      if (novidadesOpen) {
        // engole tudo o resto: a página está aberta e por cima, atribuir uma
        // espécie por baixo dela seria uma anotação às cegas
        if (e.key === "Escape") setNovidadesOpen(false);
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
        else if (e.key === "s" || e.key === "S") toggleHovered();
        return;
      }
      if (mode !== "clusters" || !config) return;

      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setPage((p) => Math.min(totalPages - 1, p + 1));
      else if (e.key === "a" || e.key === "A") assignSpecies(activeSpecies);
      else if (e.key === "s" || e.key === "S") toggleHovered();
      else if (e.key === "d" || e.key === "D") setSelection(new Set());
      else if (e.key === "r" || e.key === "R") retireSelection();
      else if (e.key === "j" || e.key === "J") navCluster(1);
      else if (e.key === "k" || e.key === "K") navCluster(-1);
      else if (e.key === "c" || e.key === "C") {
        // "A confirmar": a imagem é boa mas não dá para identificar. Evita que a
        // mesma plântula duvidosa seja reavaliada a cada passagem.
        if (selection.size > 0) {
          assignSpecies(A_CONFIRMAR);
          setActiveSpecies(A_CONFIRMAR);
        }
      } else if (e.key === "0") {
        // teclas = atribuir directamente; SEM selecção não fazem nada (sem switch
        // silencioso da espécie ativa, que era abrupto e propenso a erro)
        if (selection.size > 0) {
          assignSpecies(LIXO);
          setActiveSpecies(LIXO);
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < labels.length && selection.size > 0) {
          const lbl = labels[idx];
          assignSpecies(lbl);
          setActiveSpecies(lbl);
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, config, lightbox, lightboxList, helpOpen, novidadesOpen, totalPages, assignSpecies, activeSpecies, navCluster, labels, selection, retireSelection, removeSelectedLabels, toggleLightboxSelect, toggleHovered, undo, redo]);

  // reatribuir a selecção (vista Espécies) a outra espécie
  const reassignSpeciesSelection = useCallback(
    (label: string) => {
      if (!label || speciesSelection.size === 0) return;
      snapshot();
      const n = speciesSelection.size;
      celebrateAssign({
        files: speciesSelection,
        label,
        color: label === LIXO ? "#e75d74" : colorOf(label),
        n,
        fallbackSelector: ".species-panel .sp-head",
      });
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
        hideMeter={mode === "species"}
        cloudState={cloudState}
        cloudSaving={cloudSaving}
        onCloudSave={handleCloudSave}
        onExportJSON={() => exportJSON(groundTruth, labels, eppoMap, familyMap, rankMap)}
        onExportCSV={() => exportCSV(groundTruth, allFilenames, eppoMap, rankMap)}
        onImport={handleImport}
        onHelp={() => setHelpOpen(true)}
        onNovidades={abrirNovidades}
        novidadesPorLer={novidadesPorLer}
      />

      {cloudAhead && (
        <div className="cloud-banner">
          <span className="t-icon">☁</span>
          <span>
            A cloud tem uma versão mais recente (
            <b>{new Date(cloudAhead.at).toLocaleString("pt-PT")}</b>,{" "}
            {Object.keys(cloudAhead.data.ground_truth ?? {}).length} anotações). Carregar
            substitui o trabalho local não guardado.
          </span>
          <div className="cb-actions">
            <button
              className="btn"
              onClick={() => {
                applyCloud(cloudAhead.data, cloudAhead.at);
                setCloudAhead(null);
                pushToast("leaf", <span>Carregado da cloud.</span>);
              }}
            >
              Carregar da cloud
            </button>
            <button className="cb-dismiss" onClick={() => setCloudAhead(null)} title="Manter o trabalho local">
              Ignorar
            </button>
          </div>
        </div>
      )}

      <ClusterRail
        config={config}
        groundTruth={groundTruth}
        currentClusterId={currentClusterId}
        nConfirmar={nConfirmar}
        onSelect={selectCluster}
      />

      <main className="work">
        <div className="work-top">
          <div className="mode-switch">
            <button className={mode === "clusters" ? "on" : ""} onClick={() => setMode("clusters")}>
              Clusters
            </button>
            <button className={mode === "species" ? "on" : ""} onClick={() => setMode("species")}>
              Coleção
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
            flying={flying}
            showAnnotated={showAnnotated}
            onToggleShowAnnotated={setShowAnnotated}
            labels={labels}
            activeSpecies={activeSpecies}
            colorOf={colorOf}
            thumbOf={thumbOf}
            eppoOf={(l) => eppoMap[l] ?? ""}
            onSetActive={setActiveSpecies}
            onToggleSelect={toggleSelect}
            onPaintSelect={paintSelect}
            onOpenLightbox={openLightbox}
            onAssign={() => assignSpecies(activeSpecies)}
            onSelectPage={selectPage}
            onToggleMany={toggleMany}
            onRetire={retireSelection}
            onClear={() => setSelection(new Set())}
            onSelectCluster={selectCluster}
            clusterOf={(f) => fileToCluster.get(f) ?? null}
            focusFile={cardFocus}
            onFocusHandled={() => setCardFocus(null)}
          />
        ) : (
          <SpeciesView
            // O Lixo saiu daqui: a Coleção é uma colecção de ESPÉCIES, e imagens
            // deitadas fora não são uma espécie. Vivem agora no caixote flutuante.
            labels={[...labels, A_CONFIRMAR]}
            groundTruth={groundTruth}
            colorOf={colorOf}
            speciesPage={speciesPage}
            setSpeciesPage={setSpeciesPage}
            selection={speciesSelection}
            setSelection={setSpeciesSelection}
            onRemoveLabels={removeSelectedLabels}
            onReassign={reassignSpeciesSelection}
            onOpenLightbox={openLightbox}
            onEditSpecies={editSpecies}
            onRemove={removeLabel}
            onSetColor={setSpeciesColor}
            eppoOf={(l) => eppoMap[l] ?? ""}
            familyOf={familyOf}
            rankOf={rankOf}
            eppoVocab={eppoVocab}
            totalAll={allFilenames.length}
            thumbOf={thumbOf}
            clusterOf={(f) => fileToCluster.get(f) ?? null}
            onGoToCluster={goToSourceCluster}
            onOpenCluster={selectCluster}
            focus={speciesFocus}
            onFocusHandled={() => setSpeciesFocus(null)}
          />
        )}

        {/* caixote sempre presente no separador Clusters, mesmo vazio: é assim
            que se percebe que o Lixo é um sítio onde se entra e não um botão de
            apagar definitivo */}
        {mode === "clusters" && (
          <BinFlutuante
            n={nLixo}
            activo={currentClusterId === CID_LIXO}
            onAbrir={() => selectCluster(CID_LIXO)}
          />
        )}
      </main>

      <SpeciesPanel
        labels={labels}
        colorOf={colorOf}
        thumbOf={thumbOf}
        activeSpecies={activeSpecies}
        eppoVocab={eppoVocab}
        eppoOf={(l) => eppoMap[l] ?? ""}
        familyOf={familyOf}
        rankOf={rankOf}
        countOf={(l) => countByLabel.get(l) ?? 0}
        onGoToSpecies={goToSpecies}
        onAdd={addLabel}
        onEditSpecies={editSpecies}
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
        eppoCode={lightbox && groundTruth[lightbox] ? eppoMap[groundTruth[lightbox]] : undefined}
        onToggleSelect={toggleLightboxSelect}
        clusterId={lightbox ? fileToCluster.get(lightbox) : undefined}
        onGoToCluster={lightbox ? () => goToSourceCluster(lightbox) : undefined}
        onClose={() => setLightbox(null)}
      />

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {novidadesOpen && <Novidades onClose={() => setNovidadesOpen(false)} />}

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
