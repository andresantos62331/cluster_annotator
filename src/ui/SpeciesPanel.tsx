import { useState } from "react";
import type { EppoEntry } from "../eppo";
import { LIXO } from "../colors";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { AddSpecies, EppoChip } from "./EppoInput";
import { IconPencil, IconTrash } from "./icons";

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
  onRename,
  onReorder,
  onSetColor,
  onSetTaxon,
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
  onRename: (l: string) => void;
  onReorder: (label: string, target: string) => void;
  onSetColor: (l: string, hex: string) => void;
  onSetTaxon: (l: string, code: string, family: string) => void;
}) {
  // arrastar-e-largar para reordenar (a ordem reflete-se nos atalhos 1-9 e na auditoria)
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <aside className="species-panel">
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
              title="Ver e auditar esta espécie · arrastar reordena"
            >
              <span className="sp-key">{i < 9 ? i + 1 : "·"}</span>
              <SpeciesThumb file={thumbOf(lbl)} size={30} />
              {/* nome completo numa linha; código EPPO por baixo, mais pequeno */}
              <div className="sp-id">
                <span className="sp-name">{lbl}</span>
                <EppoChip
                  code={eppoOf(lbl)}
                  family={familyOf(lbl)}
                  vocab={eppoVocab}
                  onSet={(code, family) => onSetTaxon(lbl, code, family)}
                />
              </div>
              <button
                className="sp-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(lbl);
                }}
                title="Renomear espécie"
              >
                <IconPencil size={13} />
              </button>
              {/* cor à direita (swatch alinhado na margem) */}
              <SpeciesColorDot color={col} onPick={(hex) => onSetColor(lbl, hex)} />
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
        <span className="sp-name" style={{ color: "var(--danger)" }}>{LIXO}</span>
      </div>

    </aside>
  );
}
