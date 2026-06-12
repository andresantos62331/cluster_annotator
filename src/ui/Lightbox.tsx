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
  selected = false,
  clusterId,
  onGoToCluster,
  onClose,
}: {
  filename: string | null;
  geo?: CropGeo | null;
  label?: string;
  color?: string;
  selected?: boolean;
  clusterId?: number;
  onGoToCluster?: () => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null); // fallback sem geo
  const [origLoaded, setOrigLoaded] = useState(false);
  // limite de zoom-out: a foto inteira enquadrada (calculado por imagem ao abrir)
  const [minScale, setMinScale] = useState(0.1);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const wrapElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDims(null);
    setView(0);
    setOrigLoaded(false);
  }, [filename]);

  const setTransformTo = useCallback((cx: number, cy: number, scale: number) => {
    const wrap = wrapElRef.current;
    const inst = transformRef.current;
    if (!wrap || !inst) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (!W || !H) return;
    inst.setTransform(W / 2 - scale * cx, H / 2 - scale * cy, scale, 0);
  }, []);

  // enquadra a imagem inteira no viewport (e fixa esse scale como o mínimo)
  const fitAll = useCallback(
    (natW: number, natH: number) => {
      const wrap = wrapElRef.current;
      if (!wrap || !natW || !natH) return;
      const fit = Math.min(wrap.clientWidth / natW, wrap.clientHeight / natH, 1);
      setMinScale(fit);
      setTransformTo(natW / 2, natH / 2, fit);
    },
    [setTransformTo],
  );

  // centra na plântula: o rect do crop ocupa ~55% do viewport (sem ampliar >2.5×)
  const fitPlant = useCallback(() => {
    const wrap = wrapElRef.current;
    if (!wrap || !geo) return;
    const s = Math.min((0.55 * wrap.clientWidth) / geo.w, (0.55 * wrap.clientHeight) / geo.h, 2.5);
    setTransformTo(geo.x + geo.w / 2, geo.y + geo.h / 2, s);
  }, [geo, setTransformTo]);

  // ao abrir com geometria conhecida, centra logo na plântula (não espera o load)
  useEffect(() => {
    if (!filename || !geo) return;
    const wrap = wrapElRef.current;
    if (wrap) setMinScale(Math.min(wrap.clientWidth / geo.iw, wrap.clientHeight / geo.ih, 1));
    fitPlant();
  }, [filename, geo, fitPlant]);

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
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [filename, geo]);

  if (!filename) return <div className="lightbox" />;

  const canvasW = geo ? geo.iw : (dims?.w ?? 0);
  const canvasH = geo ? geo.ih : (dims?.h ?? 0);
  const mark = geo
    ? {
        cx: geo.x + geo.w / 2,
        cy: geo.y + geo.h / 2,
        r: Math.min(geo.w, geo.h) * 0.4,
        sw: Math.max(2, Math.round(Math.min(geo.w, geo.h) * 0.009)),
      }
    : null;

  return (
    <div className="lightbox open" onClick={onClose}>
      <button className="close" onClick={onClose} title="Fechar (Esc)">
        ×
      </button>

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
          minScale={minScale}
          maxScale={20}
          initialScale={1}
          wheel={{ step: 0.05 }}
          doubleClick={{ disabled: true }}
          panning={{ velocityDisabled: true }}
          limitToBounds={false}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => zoomOut()} title="Afastar">−</button>
                {geo && (
                  <button onClick={fitPlant} title="Centrar na plântula">⌖</button>
                )}
                <button onClick={() => canvasW && fitAll(canvasW, canvasH)} title="Ajustar a imagem inteira">⟲</button>
                <button onClick={() => zoomIn()} title="Aproximar">+</button>
              </div>

              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                {geo ? (
                  <div className="lb-canvas" style={{ width: geo.iw, height: geo.ih, position: "relative" }}>
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
                    {view === 0 && mark && (
                      <svg
                        width={geo.iw}
                        height={geo.ih}
                        viewBox={`0 0 ${geo.iw} ${geo.ih}`}
                        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                      >
                        {/* marcador do centro: círculo fino tracejado + ponto, com
                            halo escuro subtil para contrastar em qualquer fundo */}
                        <g fill="none" strokeLinecap="round">
                          <circle
                            cx={mark.cx}
                            cy={mark.cy}
                            r={mark.r}
                            stroke="rgba(8,6,3,0.45)"
                            strokeWidth={mark.sw * 2}
                          />
                          <circle
                            cx={mark.cx}
                            cy={mark.cy}
                            r={mark.r}
                            stroke="#ff6a3d"
                            strokeWidth={mark.sw}
                            strokeDasharray={`${mark.r * 0.22} ${mark.r * 0.14}`}
                            opacity={0.95}
                          />
                          <circle cx={mark.cx} cy={mark.cy} r={mark.sw * 1.6} fill="rgba(8,6,3,0.45)" stroke="none" />
                          <circle cx={mark.cx} cy={mark.cy} r={mark.sw * 1.1} fill="#ff6a3d" stroke="none" />
                        </g>
                      </svg>
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
                          strokeWidth={mark ? mark.sw * 0.7 : 3}
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

      <div className="info" onClick={(e) => e.stopPropagation()}>
        {selected && <span className="li-sel">✓ selecionada</span>}
        {label && (
          <span style={{ color, fontWeight: 700, marginRight: 8 }}>● {label}</span>
        )}
        {filename}
        {geo
          ? ` · ${geo.src} · crop ${geo.w}×${geo.h} px`
          : dims && ` · ${dims.w}×${dims.h} px`}
        {clusterId != null && clusterId !== -1 && onGoToCluster && (
          <button className="li-cluster" onClick={onGoToCluster} title="Ir para o cluster de origem">
            Ir para cluster de origem (c{clusterId})
          </button>
        )}
        <span className="li-hint">
          {geo
            ? "↑/↓ vistas · ←/→ plântula · S seleciona · scroll = zoom · ⌖ = plântula"
            : "←/→ plântula · S seleciona · scroll = zoom · ⟲ = ajustar"}
        </span>
      </div>
    </div>
  );
}
