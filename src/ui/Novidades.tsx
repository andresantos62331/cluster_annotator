import { NOVIDADES } from "../novidades";

const baseUrl = import.meta.env.BASE_URL || "/";

// Registo de novidades da ferramenta. Mesma mecânica da ajuda (sobreposição que
// fecha com Esc, X ou clique fora) porque é o mesmo gesto: parar um instante,
// ler, voltar ao trabalho. Aberta pelo sino da barra de cima ou por #novidades
// no endereço — é este último que se põe nos emails.
//
// As demonstrações são MP4 com autoplay/loop/muted: lêem-se como um GIF (começam
// e repetem sozinhas, sem controlos para descobrir) mas ficam muito mais leves e
// com muito melhor definição num ecrã escuro.
export function Novidades({ onClose }: { onClose: () => void }) {
  const menosMovimento =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-card nov-card" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} title="Fechar (Esc)">
          ×
        </button>

        <h2>Novidades da ferramenta</h2>
        <p className="nov-intro">
          O que mudou desde a última vez, da mais recente para a mais antiga.
        </p>

        {NOVIDADES.map((n) => (
          <section className="nov-entrada" key={n.id}>
            <header className="nov-head">
              <span className="nov-data mono">{n.data}</span>
              <span className="nov-linha" />
            </header>
            <h3 className="nov-titulo">{n.titulo}</h3>
            {n.resumo && <p className="nov-resumo">{n.resumo}</p>}

            <ol className="nov-itens">
              {n.itens.map((it) => (
                <li key={it.titulo}>
                  <div className="nov-it-h">
                    <span className="nov-it-t">{it.titulo}</span>
                    {it.tecla && <kbd>{it.tecla}</kbd>}
                  </div>
                  <p className="nov-it-p">{it.texto}</p>
                  {it.video && (
                    <figure className="nov-fig">
                      <video
                        src={`${baseUrl}novidades/${it.video}`}
                        aria-label={it.alt ?? it.titulo}
                        // repete sozinho e sem som — lê-se como um GIF, mas quem
                        // pediu menos movimento no sistema recebe os controlos e
                        // decide se quer ver
                        autoPlay={!menosMovimento}
                        loop={!menosMovimento}
                        controls={menosMovimento}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    </figure>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <div className="help-note nov-rodape">
          Esta página fica sempre acessível pelo sino na barra de cima. Se alguma
          coisa não estiver a funcionar como aqui se descreve, diz — é erro meu, não
          teu.
        </div>
      </div>
    </div>
  );
}
