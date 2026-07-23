import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { checkEppo, searchEppo, type EppoEntry } from "../eppo";
import { IconPencil } from "./icons";

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

// Chip do código EPPO — SÓ LEITURA. A edição (nome + código + família) está toda
// centralizada no lápis (TaxonEditor); o chip apenas mostra o código e assinala,
// com um tom âmbar discreto, quando o código pertence a outra espécie da base.
export function EppoChip({
  code,
  label,
  vocab,
}: {
  code: string;
  label: string; // nome da espécie — para confrontar com o código
  vocab: EppoEntry[];
}) {
  const check = useMemo(() => checkEppo(vocab, code, label), [vocab, code, label]);
  if (!code) return <span className="eppo-chip none mono">sem código</span>;
  return (
    <span
      className={`eppo-chip has ${check?.kind === "mismatch" ? "warn" : ""} mono`}
      title={
        check?.kind === "mismatch"
          ? `${code} é o código de ${check.entry.name}, não de ${label} — corrigir no lápis`
          : `Código EPPO ${code}`
      }
    >
      {code}
    </span>
  );
}

// Editor ÚNICO de uma espécie, aberto pelo lápis: nome, código EPPO e família no
// mesmo sítio (antes o nome era um prompt() e o resto vivia no chip). O campo do
// código é também a pesquisa na base curada — escolher uma sugestão preenche
// código + família; o nome nunca é sobreposto (é a chave das anotações).
// Posição fixa para escapar ao clipping das listas com scroll.
export function TaxonEditor({
  label,
  code,
  family,
  vocab,
  className = "sp-edit",
  size = 13,
  onSave,
}: {
  label: string;
  code: string;
  family: string;
  vocab: EppoEntry[];
  className?: string;
  size?: number;
  onSave: (name: string, code: string, family: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nameField, setNameField] = useState("");
  const [codeField, setCodeField] = useState("");
  const [famField, setFamField] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [showNameSug, setShowNameSug] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const matches = useMemo(() => searchEppo(vocab, codeField, 10), [vocab, codeField]);
  // o campo do NOME pesquisa a base tal como na criação de espécie
  const nameMatches = useMemo(() => searchEppo(vocab, nameField, 10), [vocab, nameField]);
  // o aviso segue o que está a ser escrito (nome E código), não o valor gravado
  const draftCheck = useMemo(() => checkEppo(vocab, codeField, nameField), [vocab, codeField, nameField]);

  // ao abrir: posiciona e sincroniza os campos com os valores atuais
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    setNameField(label);
    setCodeField(code);
    setFamField(family);
    setShowSug(false);
    setShowNameSug(false);
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 252, H = 360, gap = 6;
    let left = Math.min(r.left, window.innerWidth - W - 8);
    left = Math.max(8, left);
    let top = r.bottom + gap;
    if (top + H > window.innerHeight - 8) top = Math.max(8, window.innerHeight - H - 8);
    setPos({ top, left });
  }, [open, label, code, family]);

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

  // escrever no campo de código: procura na base; se bater EXATO num código,
  // preenche a família automaticamente. Senão, escreve-se a família à mão.
  const onCodeChange = (v: string) => {
    setCodeField(v);
    setShowSug(true);
    const exact = vocab.find((e) => e.code.toLowerCase() === v.trim().toLowerCase());
    if (exact) setFamField(exact.family ?? "");
  };
  const pick = (e: EppoEntry) => {
    setCodeField(e.code);
    setFamField(e.family ?? "");
    setShowSug(false);
  };
  // escolher pelo NOME (lista de sugestões ou nome sublinhado no aviso): adota a
  // espécie inteira da base — nome, código e família de uma vez
  const adopt = (e: EppoEntry) => {
    setNameField(e.name);
    setCodeField(e.code);
    setFamField(e.family ?? "");
    setShowNameSug(false);
    setShowSug(false);
  };
  const save = () => {
    onSave(nameField.trim(), codeField.trim().toUpperCase(), famField.trim());
    setOpen(false);
  };
  const clearTaxon = () => {
    onSave(nameField.trim(), "", "");
    setOpen(false);
  };

  return (
    <span className="eppo-chip-wrap" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        onClick={() => setOpen((o) => !o)}
        title="Editar espécie — nome, código EPPO e família"
      >
        <IconPencil size={size} />
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          className="eppo-pop"
          role="dialog"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="eppo-pop-h">nome da espécie</div>
          {/* pesquisa na base, como na criação de espécie: escolher preenche os três campos */}
          <div className="eppo-code-field">
            <input
              autoFocus
              value={nameField}
              placeholder="ex.: Chenopodium album (procura na base)"
              spellCheck={false}
              onChange={(e) => {
                setNameField(e.target.value);
                setShowNameSug(true);
              }}
              onFocus={() => setShowNameSug(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                else if (e.key === "Escape") setShowNameSug(false);
              }}
            />
            {showNameSug && nameField.trim() && nameMatches.length > 0 && (
              <div className="eppo-pop-list">
                {nameMatches.map((e) => (
                  <button key={e.code} type="button" onClick={() => adopt(e)}>
                    <span className="eppo-code mono">{e.code}</span>
                    <span className="eppo-name">{e.name}</span>
                    {e.common_pt && <span className="eppo-common">{e.common_pt}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="eppo-pop-h">código EPPO</div>
          <div className="eppo-code-field">
            <input
              className="mono"
              value={codeField}
              placeholder="ex.: CHEAL (ou procurar por nome)"
              spellCheck={false}
              onChange={(e) => onCodeChange(e.target.value)}
              onFocus={() => setShowSug(true)}
            />
            {showSug && codeField.trim() && matches.length > 0 && (
              <div className="eppo-pop-list">
                {matches.map((e) => (
                  <button key={e.code} type="button" onClick={() => pick(e)}>
                    <span className="eppo-code mono">{e.code}</span>
                    <span className="eppo-name">{e.name}</span>
                    {e.family && <span className="eppo-common">{e.family}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* rede contra códigos escritos à mão */}
          {draftCheck?.kind === "mismatch" && (
            <div className="eppo-note warn">
              <b>{draftCheck.entry.code}</b> é o código de{" "}
              {/* clicar adota a espécie da base: nome, código e família */}
              <button
                type="button"
                className="eppo-adopt"
                onClick={() => adopt(draftCheck.entry)}
                title={`Passar a espécie a ${draftCheck.entry.name}${draftCheck.entry.family ? ` (${draftCheck.entry.family})` : ""}`}
              >
                {draftCheck.entry.name}
              </button>
              .
            </div>
          )}
          <div className="eppo-pop-h">família</div>
          <input
            value={famField}
            placeholder="ex.: Amaranthaceae"
            spellCheck={false}
            onChange={(e) => setFamField(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button className="eppo-pop-save" type="button" onClick={save}>
            Guardar
          </button>
          {(code || family) && (
            <button type="button" className="eppo-pop-clear" onClick={clearTaxon}>
              Limpar código e família
            </button>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}

// Criação CENTRALIZADA de espécie: um botão "Adicionar espécie" abre um formulário
// com Nome, Código EPPO e Família. Mesma lógica: pesquisa na base por nome/código
// (escolher preenche os três), código exato autocompleta a família, e o que não
// existir escreve-se à mão. Nome é obrigatório; código/família opcionais.
export function AddSpecies({
  vocab,
  onAdd,
}: {
  vocab: EppoEntry[];
  onAdd: (name: string, code: string, family: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [family, setFamily] = useState("");
  const [showSug, setShowSug] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => searchEppo(vocab, name, 10), [vocab, name]);

  const reset = () => {
    setName("");
    setCode("");
    setFamily("");
    setShowSug(false);
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);

  const pick = (e: EppoEntry) => {
    setName(e.name);
    setCode(e.code);
    setFamily(e.family ?? "");
    setShowSug(false);
  };
  const onNameChange = (v: string) => {
    setName(v);
    setShowSug(true);
    const exact = vocab.find((e) => e.name.toLowerCase() === v.trim().toLowerCase());
    if (exact) {
      setCode(exact.code);
      setFamily(exact.family ?? "");
    }
  };
  const onCodeChange = (v: string) => {
    setCode(v);
    const exact = vocab.find((e) => e.code.toLowerCase() === v.trim().toLowerCase());
    if (exact) {
      setFamily(exact.family ?? "");
      if (!name.trim()) setName(exact.name);
    }
  };
  const submit = () => {
    const t = name.trim();
    if (!t) return;
    onAdd(t, code.trim().toUpperCase(), family.trim());
    close();
  };

  if (!open) {
    return (
      <button className="add-species-btn" onClick={() => setOpen(true)}>
        + Adicionar espécie
      </button>
    );
  }

  return (
    <div className="add-species" ref={ref}>
      <div className="as-field">
        <label>Nome</label>
        <div className="as-search">
          <input
            autoFocus
            value={name}
            placeholder="nome científico ou comum…"
            spellCheck={false}
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={() => setShowSug(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              else if (e.key === "Escape") close();
            }}
          />
          {showSug && name.trim() && matches.length > 0 && (
            <div className="eppo-pop-list">
              {matches.map((e) => (
                <button key={e.code} type="button" onClick={() => pick(e)}>
                  <span className="eppo-code mono">{e.code}</span>
                  <span className="eppo-name">{e.name}</span>
                  {e.family && <span className="eppo-common">{e.family}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="as-field">
        <label>Código EPPO</label>
        <input
          className="mono"
          value={code}
          placeholder="ex.: CHEAL (opcional)"
          spellCheck={false}
          onChange={(e) => onCodeChange(e.target.value)}
        />
      </div>
      <div className="as-field">
        <label>Família</label>
        <input
          value={family}
          placeholder="ex.: Amaranthaceae (opcional)"
          spellCheck={false}
          onChange={(e) => setFamily(e.target.value)}
        />
      </div>
      <div className="as-actions">
        <button className="btn" onClick={close}>Cancelar</button>
        <button className="btn assign" onClick={submit} disabled={!name.trim()}>
          Adicionar
        </button>
      </div>
    </div>
  );
}
