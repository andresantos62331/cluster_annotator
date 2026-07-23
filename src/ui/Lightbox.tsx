import { useCallback, useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { CropGeo } from "../types";

const baseUrl = import.meta.env.BASE_URL || "/";

// Vista em detalhe com 3 estados em ciclo (setas ←/→ ou seletor):
//   0 Original — a foto original centrada na plântula, com marcador no centro
//   1 Caixa    — só a região da bounding box visível (resto escurecido)
//   2 Recorte  — a máscara aplicada: plântula recortada em alta definição
// Os 3 estados partilham o MESMO espaço de coordenadas (o original), por isso o
// zoom/pan mantém-se ao alternar. Sem geometria (crop_geometry.json), cai no
// comportamento antigo: o crop plants/ sozinho.
type View = 0 | 1 | 2;
const VIEW_LABELS: Record<View, string> = { 0: "Original", 1: "Caixa", 2: "Recorte" };

export function Lightbox({
  filename,
  geo,
  label,
  color,
  eppoCode,
  selected = false,
  onToggleSelect,
  clusterId,
  onGoToCluster,
  onClose,
}: {
  filename: string | null;
  geo?: CropGeo | null;
  label?: string;
  color?: string;
  eppoCode?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  clusterId?: number;
  onGoToCluster?: () => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null); // fallback sem geo
  const [origLoaded, setOrigLoaded] = useState(false);
  // contador que (re)dispara a animação de localizar a plântula (key remonta o elemento)
  const [flash, setFlash] = useState(0);
  // popover "?" com os atalhos do viewport (em vez de texto fixo na barra)
  const [helpOpen, setHelpOpen] = useState(false);
  // limite de zoom-out: a foto inteira enquadrada (calculado por imagem ao abrir)
  const [minScale, setMinScale] = useState(0.1);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const wrapElRef = useRef<HTMLDivElement>(null);

  // o canvas só aparece depois do transform inicial estar assente — evita o
  // flash de milissegundos com a foto a scale 1 (um close-up irreconhecível)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDims(null);
    setView(0);
    setOrigLoaded(false);
    setHelpOpen(false);
    setReady(false);
  }, [filename]);

  // ms > 0 anima a viagem (easeOut), como o zoom in/out — nada de teletransporte
  const setTransformTo = useCallback((cx: number, cy: number, scale: number, ms = 0) => {
    const wrap = wrapElRef.current;
    const inst = transformRef.current;
    if (!wrap || !inst) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (!W || !H) return;
    inst.setTransform(W / 2 - scale * cx, H / 2 - scale * cy, scale, ms, "easeOut");
  }, []);

  // enquadra a imagem inteira no viewport (e fixa esse scale como o mínimo)
  const fitAll = useCallback(
    (natW: number, natH: number, ms = 0) => {
      const wrap = wrapElRef.current;
      if (!wrap || !natW || !natH) return;
      const fit = Math.min(wrap.clientWidth / natW, wrap.clientHeight / natH, 1);
      setMinScale(fit);
      setTransformTo(natW / 2, natH / 2, fit, ms);
    },
    [setTransformTo],
  );

  // centra na plântula: o rect do crop ocupa ~55% do viewport (sem ampliar >2.5×)
  const fitPlant = useCallback(
    (ms = 0) => {
      const wrap = wrapElRef.current;
      if (!wrap || !geo) return;
      const s = Math.min((0.55 * wrap.clientWidth) / geo.w, (0.55 * wrap.clientHeight) / geo.h, 2.5);
      setTransformTo(geo.x + geo.w / 2, geo.y + geo.h / 2, s, ms);
    },
    [geo, setTransformTo],
  );

  // ⌖ / Shift+F: viagem animada até à plântula + nuvem de realce à chegada
  const focusPlant = useCallback(() => {
    fitPlant(420);
    window.setTimeout(() => setFlash((k) => k + 1), 320);
  }, [fitPlant]);

  // Zoom da roda com PASSO FIXO por evento (10%), ancorado no cursor. O wheel da
  // própria biblioteca escala o zoom pela magnitude do deltaY — ratos/trackpads
  // reportam deltaY enorme e davam saltos absurdos mesmo com step baixo. Usamos
  // só o SINAL do deltaY. Listener nativo (passive:false) para poder preventDefault.
  useEffect(() => {
    const wrap = wrapElRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      const inst = transformRef.current;
      if (!inst) return;
      e.preventDefault();
      const st = inst.instance.state;
      const scale = st.scale;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.min(20, Math.max(minScale, scale * factor));
      if (next === scale) return;
      const rect = wrap.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // mantém o ponto sob o cursor fixo ao mudar de escala
      const nx = cx - ((cx - st.positionX) / scale) * next;
      const ny = cy - ((cy - st.positionY) / scale) * next;
      inst.setTransform(nx, ny, next, 0);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [minScale]);

  // ao abrir (ou navegar ←/→): a foto aparece LOGO inteira (zoomed out, sem
  // animação — o transform inicial é calculado abaixo no render) e de seguida
  // faz o "Shift+F": viagem animada até à plântula + nuvem. O fitAll aos 60ms
  // é cinto-e-suspensórios para o 1º open (wrap ainda não medido no render).
  useEffect(() => {
    if (!filename || !geo) return;
    const wrap = wrapElRef.current;
    if (wrap) setMinScale(Math.min(wrap.clientWidth / geo.iw, wrap.clientHeight / geo.ih, 1));
    const t0 = window.setTimeout(() => {
      fitAll(geo.iw, geo.ih);
      setReady(true); // transform assente -> revelar o canvas
    }, 60);
    const t1 = window.setTimeout(() => focusPlant(), 520); // "Shift+F"
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [filename, geo, fitAll, focusPlant]);

  // ↑/↓ alternam a vista (só com geometria); ←/→ mudam de plântula (no App);
  // o Esc é gerido no App
  useEffect(() => {
    if (!filename || !geo) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setView((v) => ((v + 1) % 3) as View);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setView((v) => ((v + 2) % 3) as View);
      } else if (e.key === "f" || e.key === "F") {
        // F = só o "ping" onde a plântula está; Shift+F = viagem animada + ping
        if (e.shiftKey) focusPlant();
        else setFlash((k) => k + 1);
      } else if (e.key === "c" || e.key === "C") {
        // ajustar a foto inteira (= botão ⟲), com animação
        fitAll(geo.iw, geo.ih, 420);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [filename, geo, focusPlant, fitAll]);

  if (!filename) return <div className="lightbox" />;

  const canvasW = geo ? geo.iw : (dims?.w ?? 0);
  const canvasH = geo ? geo.ih : (dims?.h ?? 0);
  const bboxStroke = geo ? Math.max(3, Math.round(Math.min(geo.w, geo.h) * 0.012)) : 3;

  // transform INICIAL = foto inteira enquadrada, calculado já no render (a
  // TransformWrapper é remontada por filename) — sem frame a scale 1
  const wrapEl = wrapElRef.current;
  let initScale = 1;
  let initX = 0;
  let initY = 0;
  if (geo && wrapEl && wrapEl.clientWidth) {
    initScale = Math.min(wrapEl.clientWidth / geo.iw, wrapEl.clientHeight / geo.ih, 1);
    initX = (wrapEl.clientWidth - geo.iw * initScale) / 2;
    initY = (wrapEl.clientHeight - geo.ih * initScale) / 2;
  }

  return (
    <div className="lightbox open" onClick={onClose}>
      {/* controlos da janela, juntos no canto: ajuda e fechar */}
      <div className="lb-corner" onClick={(e) => e.stopPropagation()}>
        <span className="li-helpwrap">
          <button className="li-help" onClick={() => setHelpOpen((v) => !v)} title="Atalhos do viewport">
            ?
          </button>
          {helpOpen && (
            <div className="li-help-pop">
              {geo && (
                <div><kbd>↑</kbd>/<kbd>↓</kbd><span>alternar original, caixa e recorte</span></div>
              )}
              <div><kbd>←</kbd>/<kbd>→</kbd><span>plântula anterior / seguinte da secção</span></div>
              <div><kbd>S</kbd><span>selecionar esta plântula</span></div>
              {geo && <div><kbd>F</kbd><span>localizar a plântula na foto</span></div>}
              {geo && <div><kbd>⇧F</kbd><span>centrar na plântula e localizar</span></div>}
              <div><kbd>roda</kbd><span>ampliar · arrastar move a foto</span></div>
              {geo ? (
                <div><kbd>C</kbd><span>voltar à foto inteira (= ⟲)</span></div>
              ) : (
                <div><kbd>⟲</kbd><span>voltar à foto inteira</span></div>
              )}
              <div><kbd>Esc</kbd><span>fechar</span></div>
            </div>
          )}
        </span>
        <button className="close" onClick={onClose} title="Fechar (Esc)">
          ×
        </button>
      </div>

      {geo && (
        <div className="lb-views seg" onClick={(e) => e.stopPropagation()}>
          {([0, 1, 2] as View[]).map((v) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      )}

      <div className="zoom-wrap" ref={wrapElRef} onClick={(e) => e.stopPropagation()}>
        <TransformWrapper
          key={filename}
          ref={transformRef}
          minScale={Math.min(minScale, initScale)} // nunca clampar o enquadramento inicial
          maxScale={20}
          initialScale={initScale}
          initialPositionX={initX}
          initialPositionY={initY}
          wheel={{ disabled: true }}
          doubleClick={{ disabled: true }}
          panning={{ velocityDisabled: true }}
          limitToBounds={false}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => zoomOut()} title="Afastar">−</button>
                {geo && (
                  <button onClick={focusPlant} title="Centrar e localizar a plântula (Shift+F)">
                    ⌖
                  </button>
                )}
                <button onClick={() => canvasW && fitAll(canvasW, canvasH, 420)} title="Ajustar a imagem inteira (C)">⟲</button>
                <button onClick={() => zoomIn()} title="Aproximar">+</button>
              </div>

              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                {geo ? (
                  <div
                    className="lb-canvas"
                    style={{
                      width: geo.iw,
                      height: geo.ih,
                      position: "relative",
                      opacity: ready ? 1 : 0,
                      transition: "opacity 0.18s ease-out",
                    }}
                  >
                    <img
                      src={`${baseUrl}originals/${geo.src}`}
                      alt={geo.src}
                      draggable={false}
                      onLoad={() => setOrigLoaded(true)}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: geo.iw,
                        height: geo.ih,
                        visibility: view === 2 ? "hidden" : "visible",
                      }}
                    />
                    {/* "nuvem" temporária a realçar a zona da plântula — toca ao
                        abrir e com F/⌖; vive no espaço do canvas, por isso aparece
                        no sítio certo em qualquer zoom e desaparece sozinha */}
                    {flash > 0 && (
                      <div
                        key={flash}
                        className="lb-flash"
                        onAnimationEnd={() => setFlash(0)}
                        style={{
                          left: geo.x + geo.w / 2,
                          top: geo.y + geo.h / 2,
                          width: geo.w * 1.6,
                          height: geo.h * 1.6,
                        }}
                      />
                    )}
                    {view === 1 && (
                      <svg
                        width={geo.iw}
                        height={geo.ih}
                        viewBox={`0 0 ${geo.iw} ${geo.ih}`}
                        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                      >
                        {/* escurece tudo fora da bounding box */}
                        <path
                          d={`M0 0 H${geo.iw} V${geo.ih} H0 Z M${geo.x} ${geo.y} h${geo.w} v${geo.h} h${-geo.w} Z`}
                          fill="rgba(8,6,3,0.88)"
                          fillRule="evenodd"
                        />
                        <rect
                          x={geo.x}
                          y={geo.y}
                          width={geo.w}
                          height={geo.h}
                          fill="none"
                          stroke="#ff6a3d"
                          strokeWidth={bboxStroke}
                        />
                      </svg>
                    )}
                    {view === 2 && (
                      // o recorte está em espaço raw; (rot) alinha-o com o original
                      // exibido (EXIF aplicado). Para 90/270 as dimensões trocam.
                      <img
                        src={`${baseUrl}masked/${filename}`}
                        alt={filename}
                        draggable={false}
                        style={{
                          position: "absolute",
                          left: geo.x,
                          top: geo.y,
                          width: geo.rot % 180 === 0 ? geo.w : geo.h,
                          height: geo.rot % 180 === 0 ? geo.h : geo.w,
                          transformOrigin: "0 0",
                          transform:
                            geo.rot === 90
                              ? "rotate(90deg) translateY(-100%)"
                              : geo.rot === 180
                                ? "rotate(180deg) translate(-100%, -100%)"
                                : geo.rot === 270
                                  ? "rotate(270deg) translateX(-100%)"
                                  : undefined,
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <img
                    src={`${baseUrl}plants/${filename}`}
                    alt={filename}
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setDims({ w: img.naturalWidth, h: img.naturalHeight });
                      fitAll(img.naturalWidth, img.naturalHeight);
                    }}
                    style={{ display: "block", maxWidth: "none", maxHeight: "none" }}
                  />
                )}
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
        {geo && !origLoaded && view !== 2 && (
          <div className="lb-loading">a carregar o original…</div>
        )}
      </div>

      {/* Ficha da plântula: o que interessa ao olho (espécie) em cima e grande;
          os metadados técnicos em baixo, esbatidos. */}
      <div className="info" onClick={(e) => e.stopPropagation()}>
        <div className="li-line1">
          {/* mesma caixa de seleção que se usa fora do viewport */}
          {onToggleSelect && (
            <button
              className={`svb-check ${selected ? "on" : ""}`}
              onClick={onToggleSelect}
              title={selected ? "Desselecionar esta plântula (S)" : "Selecionar esta plântula (S)"}
              aria-pressed={selected}
            >
              <svg viewBox="0 0 24 24" width="13" height="13">
                <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {label ? (
            <>
              <span className="li-dot" style={{ background: color }} />
              <span className="li-species">{label}</span>
              {eppoCode && <span className="li-eppo mono">{eppoCode}</span>}
            </>
          ) : (
            <span className="li-todo">Por classificar</span>
          )}
        </div>
        <div className="li-line2 mono">
          <span className="li-file" title={geo ? `${filename} · original ${geo.src}` : filename}>
            {filename}
          </span>
          <span className="li-dim">
            {geo ? `${geo.w}×${geo.h} px` : dims ? `${dims.w}×${dims.h} px` : ""}
          </span>
          {clusterId != null && clusterId !== -1 && onGoToCluster && (
            <button className="li-cluster" onClick={onGoToCluster} title="Ir para o grupo de origem">
              c{clusterId} ↗
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
