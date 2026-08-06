import { LIXO } from "../colors";
import { IconTrash } from "./icons";

/**
 * Caixote do lixo, a flutuar no canto inferior direito da ÁREA DE TRABALHO —
 * não da página. O painel das espécies ocupa a margem direita toda e abre
 * sozinho ao aproximar o rato; encostado à página, este caixote ficava por baixo
 * dele ou apanhava com o painel a abrir-lhe por cima.
 *
 * É deliberadamente um BOTÃO e não uma zona de largada: nesta aplicação arrastar
 * quer dizer SELECCIONAR, e um alvo de largada prometia um gesto que entraria em
 * conflito com esse. Sem contorno tracejado, sem crescer quando há selecção.
 *
 * O `data-species` é o que faz as partículas de uma atribuição a Lixo virem ter
 * aqui (ver particles.ts, que procura [data-species]).
 */
export function BinFlutuante({
  n,
  activo,
  onAbrir,
}: {
  n: number;
  activo: boolean;
  onAbrir: () => void;
}) {
  return (
    <button
      type="button"
      data-species={LIXO}
      className={`bin-flutuante ${activo ? "on" : ""} ${n === 0 ? "vazio" : ""}`}
      onClick={onAbrir}
      title={
        n === 0
          ? "Lixo — ainda não há nada aqui. Tecla 0 descarta a selecção."
          : `Ver o lixo — ${n} ${n === 1 ? "imagem descartada" : "imagens descartadas"}`
      }
      aria-label={`Lixo, ${n} ${n === 1 ? "imagem" : "imagens"}`}
    >
      <IconTrash size={22} />
      {n > 0 && <span className="bin-n mono">{n}</span>}
    </button>
  );
}
