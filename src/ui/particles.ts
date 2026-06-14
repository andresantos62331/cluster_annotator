// Animação de "alimentar a espécie": ao atribuir, as próprias imagens
// selecionadas fazem um POP e ENCOLHEM até ~tamanho de partícula enquanto voam
// (em arco) até à linha da espécie no painel direito, que PULSA à chegada. Como
// o clone fica por cima da imagem real, mascara o desaparecimento brusco (a real
// é removida no re-render) e dá um movimento contínuo e uniforme.
// Imperativo, sem estado React, via Web Animations API (transform/opacity = GPU).

// UM pulse, mas a DURAÇÃO cresce em proporção direta com o nº de imagens
// atribuídas (mais imagens = "alimentar" mais demorado). Com teto.
function pulseDuration(n: number): number {
  return Math.min(2200, Math.round(320 + Math.max(1, n) * 45));
}

const MOTE_CAP = 36; // teto de clones animados (perf); amostra distribuída acima disto
const END_SIZE = 15; // tamanho final do mote (≈ partícula)

let layerEl: HTMLDivElement | null = null;
function layer(): HTMLDivElement {
  if (layerEl && document.body.contains(layerEl)) return layerEl;
  layerEl = document.createElement("div");
  layerEl.className = "particle-layer";
  document.body.appendChild(layerEl);
  return layerEl;
}

// procura a linha de uma espécie pelo data-species (sem problemas de escaping)
function speciesEl(label: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>("[data-species]");
  for (const el of els) if (el.dataset.species === label) return el;
  return null;
}

// pulse na linha da espécie (cor via --pulse, duração dinâmica via inline)
function pulse(el: HTMLElement, color: string, durationMs = 620): void {
  el.style.setProperty("--pulse", color);
  el.style.animationDuration = `${durationMs}ms`;
  el.classList.remove("species-arrived");
  void el.offsetWidth; // reinicia a animação
  el.classList.add("species-arrived");
  window.setTimeout(() => {
    el.classList.remove("species-arrived");
    el.style.animationDuration = "";
  }, durationMs + 40);
}

type Mote = { src: string; rect: DOMRect };

// imagens selecionadas VISÍVEIS (com elemento no ecrã); amostra até MOTE_CAP
function collectMotes(files: Iterable<string>): Mote[] {
  const all: Mote[] = [];
  const vw = window.innerWidth, vh = window.innerHeight;
  for (const f of files) {
    const el = document.querySelector(`[data-file="${CSS.escape(f)}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const img = el.querySelector("img");
    all.push({ src: img?.currentSrc || img?.getAttribute("src") || "", rect: r });
  }
  if (all.length <= MOTE_CAP) return all;
  const step = all.length / MOTE_CAP;
  const out: Mote[] = [];
  for (let i = 0; i < MOTE_CAP; i++) out.push(all[Math.floor(i * step)]);
  return out;
}

function flyMotes(motes: Mote[], targetEl: HTMLElement, color: string, pulseMs: number): void {
  const root = layer();
  const toR = targetEl.getBoundingClientRect();
  const tcx = toR.left + toR.width / 2;
  const tcy = toR.top + toR.height / 2;
  const stagger = 26;
  const baseDur = 1000; // mais devagar

  motes.forEach((m, i) => {
    const w = m.rect.width, h = m.rect.height;
    const endScale = END_SIZE / Math.max(w, h, 1);
    const sx = m.rect.left, sy = m.rect.top; // canto superior esquerdo (transform-origin top-left)
    const ex = tcx - (w * endScale) / 2;
    const ey = tcy - (h * endScale) / 2;
    const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 130;
    const my = (sy + ey) / 2 - (55 + Math.random() * 95);
    const midScale = endScale + (1 - endScale) * 0.5;

    const clone = document.createElement("div");
    clone.className = "mote";
    clone.style.width = `${w}px`;
    clone.style.height = `${h}px`;
    if (m.src) clone.style.backgroundImage = `url("${m.src}")`;
    clone.style.boxShadow = `0 0 0 2px ${color}, 0 6px 16px rgba(0,0,0,0.45)`;
    root.appendChild(clone);

    const anim = clone.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) scale(1)`, opacity: 1, offset: 0 },
        { transform: `translate(${sx}px, ${sy}px) scale(1.07)`, opacity: 1, offset: 0.09 },
        { transform: `translate(${mx}px, ${my}px) scale(${midScale})`, opacity: 0.95, offset: 0.55 },
        { transform: `translate(${ex}px, ${ey}px) scale(${endScale})`, opacity: 0, offset: 1 },
      ],
      { duration: baseDur + Math.random() * 320, delay: i * stagger, easing: "cubic-bezier(.5,0,.2,1)", fill: "both" },
    );
    anim.onfinish = () => clone.remove();
    anim.oncancel = () => clone.remove();
  });

  // UM pulse, a começar quando as imagens começam a chegar; dura ∝ nº de imagens
  window.setTimeout(() => pulse(targetEl, color, pulseMs), baseDur * 0.9);
}

// dispara a celebração: imagens selecionadas encolhem e voam até à espécie, que
// pulsa à chegada. `n` = nº de imagens (escala os pulsos). Sem dependência de
// prefers-reduced-motion (a animação aparece sempre, por decisão de produto).
export function celebrateAssign(opts: {
  files: Iterable<string>;
  label: string;
  color: string;
  n: number;
  fallbackSelector?: string;
}): void {
  const target =
    speciesEl(opts.label) ??
    (opts.fallbackSelector ? document.querySelector<HTMLElement>(opts.fallbackSelector) : null);
  if (!target) return;
  const pulseMs = pulseDuration(opts.n);
  const motes = collectMotes(opts.files);
  if (motes.length === 0) {
    pulse(target, opts.color, pulseMs); // sem imagens visíveis: só o pulse
    return;
  }
  flyMotes(motes, target, opts.color, pulseMs);
}
