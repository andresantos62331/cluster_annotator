import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchEppo, type EppoEntry } from "../eppo";

// Combobox para criar uma espécie: escreve nome científico, nome comum ou código
// EPPO -> sugestões do vocabulário curado. Escolher uma fixa nome + código; texto
// livre cria sem código (mas se bater exatamente num código/nome, anexa-o).
export function EppoCombobox({
  vocab,
  onCommit,
}: {
  vocab: EppoEntry[];
  onCommit: (name: string, code?: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // -1 = nenhuma sugestão realçada (Enter cria texto livre)
  const ref = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => searchEppo(vocab, q, 8), [vocab, q]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const pick = (e: EppoEntry) => {
    onCommit(e.name, e.code);
    setQ("");
    setOpen(false);
    setHi(-1);
  };

  const commitFree = () => {
    const t = q.trim();
    if (!t) return;
    // se o que foi escrito bate num código/nome do vocabulário, anexa o código
    const exact = vocab.find(
      (e) => e.name.toLowerCase() === t.toLowerCase() || e.code.toLowerCase() === t.toLowerCase(),
    );
    if (exact) onCommit(exact.name, exact.code);
    else onCommit(t);
    setQ("");
    setOpen(false);
    setHi(-1);
  };

  return (
    <div className="new-species eppo-combo" ref={ref}>
      <input
        value={q}
        placeholder="nova espécie — nome ou código EPPO"
        spellCheck={false}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, -1));
          } else if (e.key === "Enter") {
            if (open && hi >= 0 && matches[hi]) pick(matches[hi]);
            else commitFree();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <button onClick={commitFree} title="Criar espécie">+</button>
      {open && matches.length > 0 && (
        <div className="eppo-dd">
          {matches.map((e, i) => (
            <button
              key={e.code}
              type="button"
              className={i === hi ? "on" : ""}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(e)}
            >
              <span className="eppo-code mono">{e.code}</span>
              <span className="eppo-name">{e.name}</span>
              {e.common_pt && <span className="eppo-common">{e.common_pt}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Chip do código EPPO de uma espécie já criada. Clicar abre um popover (posição
// fixa, escapa ao clipping da lista com scroll) para procurar/definir/limpar.
export function EppoChip({
  code,
  vocab,
  onSet,
}: {
  code: string;
  vocab: EppoEntry[];
  onSet: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const matches = useMemo(() => searchEppo(vocab, q, 8), [vocab, q]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 240, H = 280, gap = 6;
    let left = Math.min(r.left, window.innerWidth - W - 8);
    left = Math.max(8, left);
    let top = r.bottom + gap;
    if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - gap);
    setPos({ top, left });
    setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <span className="eppo-chip-wrap" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={`eppo-chip ${code ? "has" : "empty"} mono`}
        onClick={() => setOpen((o) => !o)}
        title={code ? `Código EPPO: ${code} — clicar para mudar` : "Atribuir código EPPO"}
      >
        {code || "+ código"}
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          className="eppo-pop"
          role="dialog"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={q}
            placeholder="procurar nome ou código…"
            spellCheck={false}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="eppo-pop-list">
            {matches.length === 0 && <div className="eppo-pop-empty">Sem correspondências.</div>}
            {matches.map((e) => (
              <button
                key={e.code}
                type="button"
                className={e.code === code ? "on" : ""}
                onClick={() => {
                  onSet(e.code);
                  setOpen(false);
                }}
              >
                <span className="eppo-code mono">{e.code}</span>
                <span className="eppo-name">{e.name}</span>
              </button>
            ))}
          </div>
          {code && (
            <button
              type="button"
              className="eppo-pop-clear"
              onClick={() => {
                onSet("");
                setOpen(false);
              }}
            >
              Limpar código
            </button>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
