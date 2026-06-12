import { useMemo, useState } from "react";
import type { GroundTruth } from "../types";
import { LIXO, LIXO_COLOR } from "../colors";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { IconPencil, IconTrash } from "./icons";

export function SpeciesPanel({
  labels,
  groundTruth,
  colorOf,
  thumbOf,
  activeSpecies,
  onGoToSpecies,
  onAdd,
  onRename,
  onReorder,
  onSetColor,
}: {
  labels: string[];
  groundTruth: GroundTruth;
  colorOf: (l: string) => string;
  thumbOf: (l: string) => string | null;
  activeSpecies: string;
  onGoToSpecies: (l: string) => void;
  onAdd: (name: string) => void;
  onRename: (l: string) => void;
  onReorder: (label: string, target: string) => void;
  onSetColor: (l: string, hex: string) => void;
}) {
  const [name, setName] = useState("");
  // arrastar-e-largar para reordenar (a ordem reflete-se nos atalhos 1-9 e na auditoria)
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // contagem por espécie (uma passagem)
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of Object.values(groundTruth)) c[v] = (c[v] ?? 0) + 1;
    return c;
  }, [groundTruth]);

  return (
    <aside className="species-panel">
      <div className="sp-head">
        <div className="sp-h-title">
          <h2>Espécies</h2>
          <span className="sp-n mono">{labels.length}</span>
        </div>
        <div className="new-species">
          <input
            value={name}
            placeholder="nova espécie — ex.: Amaranthus"
            spellCheck={false}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onAdd(name);
                setName("");
              }
            }}
          />
          <button onClick={() => { onAdd(name); setName(""); }} title="Criar espécie">+</button>
        </div>
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
              <SpeciesColorDot color={col} onPick={(hex) => onSetColor(lbl, hex)} />
              <span className="sp-name">{lbl}</span>
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
              <span className="sp-count mono">{counts[lbl] ?? 0}</span>
            </div>
          );
        })}
      </div>

      {/* categoria reservada — fixa, sem renomear/cor/remover */}
      <div
        className={`sp-lixo ${activeSpecies === LIXO ? "active" : ""}`}
        onClick={() => onGoToSpecies(LIXO)}
        title="Crops inutilizáveis (desfocados, fragmentos, não-plantas). Tecla 0 atribui a selecção."
      >
        <span className="sp-key">0</span>
        <span className="sp-lixo-icon" style={{ color: LIXO_COLOR }}>
          <IconTrash size={15} />
        </span>
        <span className="sp-name" style={{ color: LIXO_COLOR }}>{LIXO}</span>
        <span className="sp-count mono">{counts[LIXO] ?? 0}</span>
      </div>

    </aside>
  );
}
