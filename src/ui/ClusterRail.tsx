import { useEffect, useMemo, useRef, useState } from "react";
import type { ConfigData, GroundTruth } from "../types";
import { A_CONFIRMAR, CID_CONFIRMAR } from "../colors";
import { GenBadge } from "./bits";
import { IconHelp, IconSearch } from "./icons";

const baseUrl = import.meta.env.BASE_URL || "/";
const PREVIEW = 168; // lado do popover de pré-visualização (como no SpeciesThumb)

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
  nConfirmar,
  onSelect,
}: {
  config: ConfigData;
  groundTruth: GroundTruth;
  currentClusterId: number | null;
  /** quantas estão "A confirmar" em todo o dataset (0 esconde a entrada) */
  nConfirmar: number;
  onSelect: (cid: number) => void;
}) {
  const [query, setQuery] = useState("");
  // gaveta dos concluídos — fixa no fundo do rail, fechada por omissão
  const [doneOpen, setDoneOpen] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);

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
        return true;
      });
  }, [config, groundTruth, query]);

  // ao mudar de cluster (sobretudo via chip "vizinho", que pode apontar para um
  // grupo escondido pela pesquisa): limpa a pesquisa para o tornar visível
  useEffect(() => {
    if (currentClusterId == null) return;
    const visible = config.clusterIds.includes(currentClusterId);
    if (!visible) return;
    const inList = items.some((it) => it.cid === currentClusterId);
    if (!inList) setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClusterId]);

  // traz o item ativo à vista no rail (corre também depois de repor o filtro)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentClusterId, items]);

  // A lista de cima é SÓ o que falta fazer, ordenada pelo TRABALHO PENDENTE
  // (plântulas por anotar), decrescente: os grupos com mais por fazer primeiro.
  // Desempate pelo id, para a ordem ser estável entre re-renders.
  //
  // Deixou de haver separadores de geração aqui: com esta ordenação as gerações
  // intercalam-se e os separadores repetir-se-iam. A geração continua legível no
  // badge G1/G2 de cada item, por isso não se perde informação.
  const pending = items
    .filter((it) => !it.done)
    .sort((a, b) => b.total - b.annotated - (a.total - a.annotated) || a.cid - b.cid);
  const doneItems = items.filter((it) => it.done);

  // NAVEGAR para um grupo já concluído (chip "vizinho", J/K, histograma) abre a
  // gaveta. Só a partir da segunda vez: no arranque a app selecciona um cluster
  // sozinha e, se esse já estiver anotado, a gaveta abria-se de imediato — o que
  // contraria a razão de ela existir (arrancar fechada, fora do caminho).
  // ATENÇÃO: o efeito tem de reagir à MUDANÇA de cluster, não a cada execução.
  // `items` recalcula-se várias vezes no arranque (config, depois ground truth) e
  // uma guarda de "primeira vez" não chega — a segunda passagem já abria a gaveta
  // com o mesmo cluster.
  const clusterAnterior = useRef<number | null>(null);
  useEffect(() => {
    const anterior = clusterAnterior.current;
    clusterAnterior.current = currentClusterId;
    if (currentClusterId == null) return;
    // arranque (não havia cluster antes) ou re-render com o mesmo: não abrir
    if (anterior == null || anterior === currentClusterId) return;
    if (doneItems.some((it) => it.cid === currentClusterId)) setDoneOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClusterId, items]);

  const renderItem = (it: (typeof items)[number]) => {
    const pct = it.total ? (it.annotated / it.total) * 100 : 0;
    const isNoise = it.cid === -1;
    return (
      <div
        key={it.cid}
        ref={it.cid === currentClusterId ? activeRef : undefined}
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
    );
  };

  return (
    <aside className="rail">
      <div className="rail-head">
        <div className="rh-title">
          <h2>Grupos</h2>
          {/* a contagem do topo é o que FALTA — os concluídos têm a sua própria */}
          <span className="rh-n mono">{pending.length}</span>
          <span className="rh-sub">por fazer</span>
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
      </div>

      {/* "A confirmar" é uma pilha de trabalho adiado, não um grupo: fica FIXA no
          topo, fora da lista e fora da ordenação, para ter sempre o mesmo sítio.
          O data-species é o que faz as partículas voarem para cá ao carregar em C. */}
      {nConfirmar > 0 && (
        <div
          data-species={A_CONFIRMAR}
          className={`clu clu-pilha ${currentClusterId === CID_CONFIRMAR ? "active" : ""}`}
          onClick={() => onSelect(CID_CONFIRMAR)}
          title="Plântulas que ficaram por decidir. Volta a elas quando quiseres"
        >
          <div className="clu-thumb pilha-mark">
            <IconHelp size={17} />
          </div>
          <div className="clu-body">
            <div className="clu-line1">
              <span className="clu-name">{A_CONFIRMAR}</span>
              <span className="clu-count">{nConfirmar}</span>
            </div>
            <div className="pilha-sub">por decidir</div>
          </div>
        </div>
      )}

      <div className="rail-list">
        {items.length === 0 && <div className="rail-empty">Nenhum grupo corresponde.</div>}
        {pending.map((it) => renderItem(it))}
        {pending.length === 0 && doneItems.length > 0 && (
          <div className="rail-allgone">
            <span className="ra-mark">✓</span>
            Não há grupos por fazer nesta configuração.
          </div>
        )}
      </div>

      {/* concluídos — gaveta FIXA no fundo do rail: está sempre à mão, sem ser
          preciso descer a lista toda. Fechada por omissão; abre para cima. */}
      {doneItems.length > 0 && (
        <div className={`done-drawer ${doneOpen ? "open" : ""}`}>
          {doneOpen && (
            <div className="done-list">
              {doneItems.map((it) => renderItem(it))}
            </div>
          )}
          <button className="done-head" onClick={() => setDoneOpen((v) => !v)}>
            <span className="dh-fold" aria-hidden>{doneOpen ? "▾" : "▴"}</span>
            <span className="dh-check">✓</span>
            <span className="dh-title">Concluídos</span>
            <span className="dh-n mono">{doneItems.length}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
