import { useEffect, useRef, useState } from "react";
import type { EppoEntry } from "../eppo";
import { LIXO } from "../colors";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { AddSpecies, EppoChip, TaxonEditor } from "./EppoInput";
import { IconTrash } from "./icons";

export function SpeciesPanel({
  labels,
  colorOf,
  thumbOf,
  activeSpecies,
  eppoVocab,
  eppoOf,
  familyOf,
  onGoToSpecies,
  onAdd,
  onEditSpecies,
  onReorder,
  onSetColor,
}: {
  labels: string[];
  colorOf: (l: string) => string;
  thumbOf: (l: string) => string | null;
  activeSpecies: string;
  eppoVocab: EppoEntry[];
  eppoOf: (l: string) => string;
  familyOf: (l: string) => string;
  onGoToSpecies: (l: string) => void;
  onAdd: (name: string, code?: string, family?: string) => void;
  onEditSpecies: (oldName: string, name: string, code: string, family: string) => void;
  onReorder: (label: string, target: string) => void;
  onSetColor: (l: string, hex: string) => void;
}) {
  // arrastar-e-largar para reordenar (a ordem reflete-se nos atalhos 1-9 e na auditoria)
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // painel minimizado por omissão: expande ao passar o rato, volta a minimizar
  // quando o rato sai. NÃO minimiza enquanto houver um popover aberto (editor
  // EPPO, seletor de cor — vivem fora do painel) nem com o formulário de
  // "adicionar espécie" aberto, senão fechava-se debaixo dos dedos.
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const guard = useRef<number | undefined>(undefined);

  const busy = () =>
    !!document.querySelector(".eppo-pop, .cpick-pop") ||
    !!panelRef.current?.querySelector(".add-species");

  const cancelCollapse = () => {
    window.clearInterval(guard.current);
    guard.current = undefined;
  };
  const onEnter = () => {
    cancelCollapse();
    setExpanded(true);
  };
  const onLeave = () => {
    cancelCollapse();
    guard.current = window.setInterval(() => {
      if (busy()) return;
      cancelCollapse();
      setExpanded(false);
    }, 240);
  };
  useEffect(() => cancelCollapse, []);

  return (
    <aside
      ref={panelRef}
      className={`species-panel ${expanded ? "" : "collapsed"}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="sp-head">
        <div className="sp-h-title">
          <h2>Espécies</h2>
          <span className="sp-n mono">{labels.length}</span>
        </div>
        <AddSpecies vocab={eppoVocab} onAdd={onAdd} />
      </div>

      <div className="sp-list">
        {labels.length === 0 && (
          <div className="sp-empty">
            Sem espécies ainda.
            <br />
            Cria a primeira acima e a cor fica fixa.
          </div>
        )}
        {labels.map((lbl, i) => {
          const col = colorOf(lbl);
          return (
            <div
              key={lbl}
              data-species={lbl}
              className={`sp-row ${lbl === activeSpecies ? "active" : ""} ${dragging === lbl ? "dragging" : ""} ${
                dragOver === lbl && dragging && dragging !== lbl ? "drag-over" : ""
              }`}
              draggable
              onDragStart={(e) => {
                setDragging(lbl);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(lbl);
              }}
              onDragLeave={() => setDragOver((o) => (o === lbl ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging && dragging !== lbl) onReorder(dragging, lbl);
                setDragging(null);
                setDragOver(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setDragOver(null);
              }}
              onClick={() => onGoToSpecies(lbl)}
              title={expanded ? "Ver e auditar esta espécie · arrastar reordena" : lbl}
            >
              <span className="sp-key">{i < 9 ? i + 1 : "·"}</span>
              {/* minimizado: só a tecla e o código EPPO (nome só no tooltip) */}
              {!expanded ? (
                <span className={`sp-mini-code ${eppoOf(lbl) ? "" : "none"}`}>{eppoOf(lbl) || "—"}</span>
              ) : (
                <>
                  <SpeciesThumb file={thumbOf(lbl)} size={30} />
                  {/* nome completo numa linha; código EPPO por baixo, mais pequeno */}
                  <div className="sp-id">
                    <span className="sp-name">{lbl}</span>
                    <EppoChip code={eppoOf(lbl)} label={lbl} vocab={eppoVocab} />
                  </div>
                  {/* lápis = editor ÚNICO: nome + código + família */}
                  <TaxonEditor
                    label={lbl}
                    code={eppoOf(lbl)}
                    family={familyOf(lbl)}
                    vocab={eppoVocab}
                    onSave={(name, code, family) => onEditSpecies(lbl, name, code, family)}
                  />
                  {/* cor à direita (swatch alinhado na margem) */}
                  <SpeciesColorDot color={col} onPick={(hex) => onSetColor(lbl, hex)} />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* categoria reservada — fixa, sem renomear/cor/remover */}
      <div
        data-species={LIXO}
        className={`sp-lixo ${activeSpecies === LIXO ? "active" : ""}`}
        onClick={() => onGoToSpecies(LIXO)}
        title="Crops inutilizáveis (desfocados, fragmentos, não-plantas). Tecla 0 atribui a selecção."
      >
        <span className="sp-key">0</span>
        <span className="sp-lixo-icon" style={{ color: "var(--danger)" }}>
          <IconTrash size={15} />
        </span>
        {expanded && <span className="sp-name" style={{ color: "var(--danger)" }}>{LIXO}</span>}
      </div>

    </aside>
  );
}
