import { useEffect, useRef, useState } from "react";
import type { EppoEntry } from "../eppo";
import { SpeciesColorDot } from "./ColorPicker";
import { SpeciesThumb } from "./SpeciesThumb";
import { AddSpecies, EppoChip, TaxonEditor } from "./EppoInput";

export function SpeciesPanel({
  labels,
  colorOf,
  thumbOf,
  activeSpecies,
  eppoVocab,
  eppoOf,
  familyOf,
  rankOf,
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
  rankOf: (l: string) => string;
  onGoToSpecies: (l: string) => void;
  onAdd: (name: string, code?: string, family?: string, rank?: string) => void;
  onEditSpecies: (oldName: string, name: string, code: string, family: string, rank: string) => void;
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
          // uma FAMÍLIA não é uma espécie com um campo em falta: é outro nível de
          // identificação. A linha inteira muda de registo (véu verde, barra
          // lateral, versaletes) em vez de ganhar mais um chip — e some o "sem
          // código", que anunciava a ausência de algo que se decidiu não ter.
          const isFamilia = rankOf(lbl) === "familia";
          return (
            <div
              key={lbl}
              data-species={lbl}
              className={`sp-row ${isFamilia ? "fam" : ""} ${lbl === activeSpecies ? "active" : ""} ${dragging === lbl ? "dragging" : ""} ${
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
              title={
                expanded
                  ? `Ver e auditar esta ${isFamilia ? "família" : "espécie"} · arrastar reordena`
                  : lbl
              }
            >
              <span className="sp-key">{i < 9 ? i + 1 : "·"}</span>
              {/* minimizado: só a tecla e o código EPPO (nome só no tooltip). Numa
                  família não há código — e um "—" leria-se como lacuna; põe-se
                  "fam.", que diz o que a etiqueta é. */}
              {!expanded ? (
                isFamilia ? (
                  <span className="sp-mini-code fam">fam.</span>
                ) : (
                  <span className={`sp-mini-code ${eppoOf(lbl) ? "" : "none"}`}>{eppoOf(lbl) || "·"}</span>
                )
              ) : (
                <>
                  <SpeciesThumb file={thumbOf(lbl)} size={30} />
                  {/* nome completo numa linha; código EPPO por baixo, mais pequeno */}
                  <div className="sp-id">
                    <span className={`sp-name ${isFamilia ? "fam-name" : ""}`}>{lbl}</span>
                    {isFamilia ? (
                      // só o nível, sem contagem: a linha de espécie também não
                      // conta nada, e contar só aqui fazia a família parecer outra
                      // coisa em vez de outro nível da mesma coisa
                      <span className="fam-sub">família</span>
                    ) : (
                      <span className="sp-tags">
                        <EppoChip code={eppoOf(lbl)} label={lbl} vocab={eppoVocab} />
                      </span>
                    )}
                  </div>
                  {/* lápis = editor ÚNICO: nome + código + família + nível */}
                  <TaxonEditor
                    label={lbl}
                    code={eppoOf(lbl)}
                    family={familyOf(lbl)}
                    rank={rankOf(lbl)}
                    vocab={eppoVocab}
                    onSave={(name, code, family, rank) =>
                      onEditSpecies(lbl, name, code, family, rank)
                    }
                  />
                  {/* cor à direita (swatch alinhado na margem) */}
                  <SpeciesColorDot color={col} onPick={(hex) => onSetColor(lbl, hex)} />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* As duas categorias reservadas SAÍRAM daqui (2026-08-06). Este painel é a
          lista de IDENTIFICAÇÕES — o que a plântula é — e nem "A confirmar" nem
          "Lixo" são identificações. Passaram a viver onde se vai trabalhá-las:
          "A confirmar" fixa no topo do rail, "Lixo" no caixote flutuante.
          As teclas C e 0 continuam a funcionar, e ambas continuam no dropdown de
          "atribuir a", que é o controlo de "atribuir o quê". */}
    </aside>
  );
}
