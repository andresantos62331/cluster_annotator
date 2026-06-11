import { useMemo, useState } from "react";
import type { GroundTruth } from "../types";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { IconPencil } from "./icons";

export function SpeciesPanel({
  labels,
  groundTruth,
  colorOf,
  thumbOf,
  activeSpecies,
  onGoToSpecies,
  onAdd,
  onRename,
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
  onSetColor: (l: string, hex: string) => void;
}) {
  const [name, setName] = useState("");

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
              className={`sp-row ${lbl === activeSpecies ? "active" : ""}`}
              onClick={() => onGoToSpecies(lbl)}
              title="Ver e auditar esta espécie"
            >
              <span className="sp-key">{i < 9 ? i + 1 : "·"}</span>
              <SpeciesThumb file={thumbOf(lbl)} color={col} size={30} />
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

      <div className="sp-foot">
        <kbd>1</kbd>–<kbd>9</kbd> escolhem a espécie · com selecção, atribuem logo · <kbd>A</kbd> atribui a ativa
      </div>
    </aside>
  );
}
