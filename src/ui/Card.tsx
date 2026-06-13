import { memo } from "react";
import { IconLocate } from "./icons";

const baseUrl = import.meta.env.BASE_URL || "/";

// Cartão de "espécime montado": thumbnail (crops/) em letterbox preto, moldura
// hairline. Clicar no cartão seleciona-o (✓ a laranja). A espécie, quando anotada,
// é dada SÓ pela cor da moldura — nunca por cima da imagem, para não falsear as
// cores da plântula. O nome do ficheiro só aparece ao expandir.
export const Card = memo(function Card({
  filename,
  selected,
  label,
  color,
  index = 0,
  raised = false,
  raiseColor,
  sourceClusterId,
  onGoToCluster,
  onToggle,
  onOpen,
}: {
  filename: string;
  selected: boolean;
  label?: string;
  color?: string;
  index?: number;
  // levantado (ex.: hover no histograma destaca as imagens desse cluster)
  raised?: boolean;
  raiseColor?: string;
  sourceClusterId?: number;
  onGoToCluster?: () => void;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const labeled = !!(label && color);
  return (
    <div
      className={`card ${selected ? "selected" : ""} ${labeled ? "labeled" : ""} ${raised ? "raised" : ""}`}
      style={{
        // escalona a entrada (cap a 24 para não atrasar páginas grandes)
        animationDelay: `${Math.min(index, 24) * 14}ms`,
        ...(labeled ? ({ ["--lbl" as string]: color }) : {}),
        ...(raised && raiseColor ? ({ ["--raise" as string]: raiseColor }) : {}),
      }}
      onClick={onToggle}
      title={filename}
      data-file={filename}
    >
      <img loading="lazy" src={`${baseUrl}crops/${filename}`} alt={filename} draggable={false} />

      <div className="card-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path d="M5 12.5l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button onClick={onOpen} title="Examinar em resolução real">⤢</button>
      </div>

      {/* canto inferior esquerdo, separado do expandir para não se confundirem */}
      {onGoToCluster && (
        <div className="card-locate" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onGoToCluster}
            title={sourceClusterId != null ? `Ir para cluster de origem (c${sourceClusterId})` : "Ir para cluster de origem"}
          >
            <IconLocate size={14} />
          </button>
        </div>
      )}
    </div>
  );
});
