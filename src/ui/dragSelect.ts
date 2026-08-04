import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

// distância (px) a partir da qual um clique deixa de ser clique e passa a ser
// arrastamento — abaixo disto o cartão trata do toggle como sempre tratou
const LIMIAR = 6;
// margem do contentor onde o arrastamento faz rolar sozinho, e velocidade máxima
const BORDA = 64;
const VEL_MAX = 22;

/** Ancestral com scroll próprio (é ele que roda sozinho ao arrastar até à borda). */
function scroller(el: HTMLElement | null): HTMLElement | null {
  for (let n = el; n; n = n.parentElement) {
    if (n.scrollHeight > n.clientHeight + 4 && /auto|scroll|overlay/.test(getComputedStyle(n).overflowY)) {
      return n;
    }
  }
  return null;
}

/**
 * Selecção por arrastamento nas grelhas de cartões ("drag-click").
 *
 * Um clique simples continua a ser do cartão (onToggle) — só quando o rato ANDA
 * mais do que o limiar é que o arrastamento assume o comando. A partir daí pinta
 * todos os cartões por onde passa com o MESMO estado, decidido pelo cartão de
 * partida: arrancar num não selecionado SELECIONA, arrancar num selecionado
 * DESSELECIONA. É a regra do explorador de ficheiros — previsível sem instruções.
 *
 * No fim engole-se o `click` que o browser dispara a seguir ao arrastamento,
 * senão o cartão de partida voltava a alternar e desfazia-se o primeiro da série.
 */
export function useDragSelect({
  isSelected,
  apply,
}: {
  isSelected: (f: string) => boolean;
  apply: (files: string[], on: boolean) => void;
}) {
  // refs para os listeners de window verem sempre a versão actual sem se re-registarem
  const isSelRef = useRef(isSelected);
  const applyRef = useRef(apply);
  useEffect(() => { isSelRef.current = isSelected; }, [isSelected]);
  useEffect(() => { applyRef.current = apply; }, [apply]);

  const limpar = useRef<(() => void) | null>(null);
  useEffect(() => () => limpar.current?.(), []);

  return useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return;
    const alvo = e.target as HTMLElement;
    // botões dentro do cartão (expandir, ir para o cluster) mantêm-se intactos
    if (alvo.closest("button, input, a, .card-actions, .card-locate")) return;
    const cartao = alvo.closest("[data-file]") as HTMLElement | null;
    const partida = cartao?.getAttribute("data-file");
    if (!partida) return;

    const x0 = e.clientX;
    const y0 = e.clientY;
    const rolo = scroller(cartao);
    let activo = false;
    let modo = true;
    let ultimo = { x: x0, y: y0 };
    let raf = 0;
    const pintados = new Set<string>();

    const pintarEm = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const f = el?.closest("[data-file]")?.getAttribute("data-file");
      if (!f || pintados.has(f)) return;
      pintados.add(f);
      applyRef.current([f], modo);
    };

    // rola sozinho enquanto o rato está encostado ao topo/fundo do contentor;
    // a cada passo repinta na posição actual, porque o conteúdo passa por baixo
    const autoscroll = () => {
      raf = 0;
      if (!activo || !rolo) return;
      const r = rolo.getBoundingClientRect();
      let d = 0;
      if (ultimo.y < r.top + BORDA) d = -VEL_MAX * Math.min(1, (r.top + BORDA - ultimo.y) / BORDA);
      else if (ultimo.y > r.bottom - BORDA) d = VEL_MAX * Math.min(1, (ultimo.y - (r.bottom - BORDA)) / BORDA);
      if (d !== 0) {
        rolo.scrollTop += d;
        pintarEm(ultimo.x, ultimo.y);
      }
      raf = requestAnimationFrame(autoscroll);
    };

    const mover = (ev: PointerEvent) => {
      ultimo = { x: ev.clientX, y: ev.clientY };
      if (!activo) {
        if (Math.abs(ev.clientX - x0) < LIMIAR && Math.abs(ev.clientY - y0) < LIMIAR) return;
        activo = true;
        modo = !isSelRef.current(partida);
        document.body.classList.add("a-arrastar");
        // o browser já começou a marcar texto (títulos das secções) antes de o
        // limiar ser atingido — limpar, senão fica realce azul por cima da grelha
        window.getSelection()?.removeAllRanges();
        pintados.add(partida);
        applyRef.current([partida], modo);
        if (rolo && !raf) raf = requestAnimationFrame(autoscroll);
      }
      pintarEm(ev.clientX, ev.clientY);
    };

    const largar = () => {
      // guardar ANTES de fim(), que repõe `activo` a false
      const arrastou = activo;
      fim();
      if (!arrastou) return;
      // o click imediatamente a seguir pertence a este arrastamento — engolir
      const comer = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", comer, true);
      setTimeout(() => window.removeEventListener("click", comer, true), 0);
    };

    const fim = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", largar);
      window.removeEventListener("pointercancel", fim);
      window.removeEventListener("blur", fim);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      activo = false;
      document.body.classList.remove("a-arrastar");
      limpar.current = null;
    };

    limpar.current = fim;
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", largar);
    window.addEventListener("pointercancel", fim);
    // largar o botão FORA da janela pode não gerar pointerup — sem isto a grelha
    // ficava presa em modo de pintura e a selecção mudava só ao passar o rato
    window.addEventListener("blur", fim);
  }, []);
}
