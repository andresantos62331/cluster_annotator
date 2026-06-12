import { useRef, useState } from "react";

const baseUrl = import.meta.env.BASE_URL || "/";
const PREVIEW = 168; // lado do popover (imagem + moldura)

// Miniatura representativa de uma espécie (1ª imagem anotada), moldura NEUTRA —
// a cor da espécie é dada pelo SpeciesColorDot ao lado, não pela miniatura.
// Como a miniatura inline é pequena, ao passar o rato mostra um POPOVER com
// a imagem em grande (posição fixa, escapa ao clipping de listas/dropdowns).
// Se a espécie ainda não tem imagens anotadas, não mostra nada.
export function SpeciesThumb({
  file,
  size = 26,
}: {
  file: string | null;
  size?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  if (!file) return null;

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 10;
    let left = r.right + gap;
    if (left + PREVIEW > window.innerWidth - 8) left = r.left - PREVIEW - gap; // sem espaço à direita -> esquerda
    left = Math.max(8, left);
    let top = r.top + r.height / 2 - PREVIEW / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - PREVIEW - 8));
    setPos({ top, left });
  };

  const onEnter = () => {
    timer.current = window.setTimeout(show, 130);
  };
  const onLeave = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };

  return (
    <span
      ref={ref}
      className="sp-thumb"
      style={{ width: size, height: size }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <img src={`${baseUrl}crops/${file}`} alt="" loading="lazy" draggable={false} />
      {pos && (
        <span className="sp-preview" style={{ top: pos.top, left: pos.left }}>
          <img src={`${baseUrl}crops/${file}`} alt="" draggable={false} />
        </span>
      )}
    </span>
  );
}
