import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PALETTE } from "../colors";

// ---- conversões de cor (sem dependências) ----
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}
const isHex6 = (s: string) => /^#?[0-9a-fA-F]{6}$/.test(s.trim());

// Swatch da espécie que abre um popover com seletor de cor próprio (área
// saturação/valor + matiz + hex), expandido logo, mais a paleta curada por baixo.
export function SpeciesColorDot({
  color,
  onPick,
}: {
  color: string;
  onPick: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(color));
  const [hexText, setHexText] = useState(color);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // ao abrir, sincroniza o seletor com a cor atual
  useEffect(() => {
    if (open) {
      setHsv(hexToHsv(color));
      setHexText(color.toUpperCase());
    }
  }, [open, color]);

  // posição fixa (escapa ao clipping de containers com scroll, p.ex. painel direito)
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 214, H = 300, gap = 8;
    let left = Math.min(r.left, window.innerWidth - W - 8);
    left = Math.max(8, left);
    let top = r.bottom + gap;
    if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - gap);
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      // o popover vive num portal fora do wrap; conta com ambos para o "click fora"
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const [h, s, v] = hsv;

  const apply = (nh: number, ns: number, nv: number) => {
    setHsv([nh, ns, nv]);
    const hex = hsvToHex(nh, ns, nv);
    setHexText(hex.toUpperCase());
    onPick(hex);
  };

  const fromEvent = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    apply(h, r.width ? x / r.width : 0, r.height ? 1 - y / r.height : 0);
  };

  const pickPalette = (c: string) => {
    setHsv(hexToHsv(c));
    setHexText(c.toUpperCase());
    onPick(c);
  };

  return (
    <div className="cpick-wrap" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={triggerRef}
        className="cpick-trigger"
        style={{ background: color }}
        onClick={() => setOpen((o) => !o)}
        title="Mudar a cor desta espécie"
        aria-label="Mudar a cor desta espécie"
      />
      {open && pos && createPortal(
        <div
          ref={popRef}
          className="cpick-pop"
          role="dialog"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* área saturação / valor */}
          <div
            ref={svRef}
            className="cpick-sv"
            style={{ backgroundColor: `hsl(${h}, 100%, 50%)` }}
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              fromEvent(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => dragging.current && fromEvent(e.clientX, e.clientY)}
            onPointerUp={() => (dragging.current = false)}
          >
            <div className="cpick-sv-white" />
            <div className="cpick-sv-black" />
            <div className="cpick-sv-knob" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: color }} />
          </div>

          {/* matiz */}
          <input
            type="range"
            className="cpick-hue"
            min={0}
            max={359}
            value={Math.round(h)}
            onChange={(e) => apply(Number(e.target.value), s, v)}
          />

          {/* hex + pré-visualização */}
          <div className="cpick-row">
            <span className="cpick-preview" style={{ background: color }} />
            <input
              className="cpick-hexin mono"
              value={hexText}
              spellCheck={false}
              onChange={(e) => {
                const t = e.target.value;
                setHexText(t);
                if (isHex6(t)) {
                  const hx = t.startsWith("#") ? t : `#${t}`;
                  setHsv(hexToHsv(hx));
                  onPick(hx.toLowerCase());
                }
              }}
            />
          </div>

          {/* paleta curada — atalho legível */}
          <div className="cpick-pal-label">paleta</div>
          <div className="cpick-grid">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`cpick-sw ${c.toLowerCase() === color.toLowerCase() ? "on" : ""}`}
                style={{ background: c }}
                title={c}
                onClick={() => pickPalette(c)}
              />
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
