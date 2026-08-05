// Ajuda integrada (botão "?" na barra superior ou tecla ?): fluxo de anotação
// em 3 passos + tabela de atalhos. Pensada para a anotadora usar a ferramenta
// sem ninguém ao lado. Fecha com Esc (gerido no App), X ou clique fora.
export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} title="Fechar (Esc)">
          ×
        </button>

        <h2>Como anotar</h2>
        <ol className="help-steps">
          <li>
            <b>Escolhe um grupo</b> na lista da esquerda. As imagens de cada grupo
            são parecidas entre si — em regra, a mesma espécie. A lista mostra
            apenas o que falta fazer; os grupos já concluídos ficam recolhidos na
            gaveta <b>«Concluídos»</b>, no fundo dessa lista.
          </li>
          <li>
            <b>Seleciona as plântulas</b> que são da mesma espécie e atribui-as com{" "}
            <kbd>A</kbd>, com o botão «Atribuir» ou com a tecla da espécie. Para
            selecionar tens três maneiras: clicar em cada uma, <b>arrastar por cima
            de várias</b> (arrancar numa que já esteja selecionada desmarca, como no
            explorador de ficheiros), ou carregar em <kbd>S</kbd> com o rato pousado
            numa imagem, sem clicar. O visto no cabeçalho marca a página inteira.
            Espécies novas criam-se no painel da direita.
          </li>
          <li>
            <b>Confere na Coleção</b>: o separador do meio reúne, para cada
            espécie, todas as imagens que lhe atribuíste, venham do grupo que
            vierem. É aqui que se apanham enganos — corrige-os com «Mover para»
            ou «Remover etiqueta».
          </li>
        </ol>

        <div className="help-note">
          O <b>painel das espécies</b>, à direita, está recolhido e abre quando lhe
          passas o rato por cima. Os números a laranja são as teclas de atribuição;
          arrastar uma espécie muda a ordem — e, com ela, as teclas. O lápis abre a
          ficha da espécie: nome, código EPPO, família e <b>nível da identificação</b>,
          com pesquisa na base.
        </div>

        <h2>As duas categorias reservadas</h2>
        <div className="help-note">
          <b>A confirmar</b> <kbd>C</kbd> — a imagem tem qualidade e mostra o que é
          preciso, e a espécie <b>é</b> identificável: o que falta é a certeza.
          Marca aqui as plântulas em que ficas em dúvida mas achas que outra pessoa
          as identificaria. Ficam guardadas à espera de uma segunda opinião, em vez
          de serem decididas à pressa — e deixas de reavaliar a mesma imagem a cada
          passagem.
          <br />
          <b>Lixo</b> <kbd>0</kbd> — a imagem não serve: desfocada, com duas ou mais
          espécies diferentes, ou apenas parte de uma planta.
          <br />
          Em resumo: no <b>Lixo</b> o problema é a <b>imagem</b>; em{" "}
          <b>A confirmar</b> a imagem está boa e o que falta é a <b>certeza</b>.
          <br />
          <b>Atenção à diferença para a família:</b> se a dúvida existe porque a
          fotografia não mostra o que distingue a espécie — as gramíneas dependem de
          apêndices e pelos que a imagem não capta —, isso não é «A confirmar»: é
          identificação ao nível da <b>família</b>. Num caso falta a certeza de quem
          está a ver; no outro falta a informação na própria foto.
        </div>

        <h2>Espécie ou família</h2>
        <div className="help-note">
          No painel da direita há dois botões de criação.
          <br />
          <b>+ Espécie</b> — o caso normal. Escreve o nome e escolhe da lista: o código
          EPPO e a família ficam preenchidos sozinhos.
          <br />
          <b>+ Família</b> — para quando a fotografia não permite chegar à espécie. As
          gramíneas são o caso típico, porque dependem de detalhes que a imagem não
          capta. Só pede o <b>nome da família</b> (ex.: <i>Poaceae</i>), sem código.
          <br />
          Fica registado no ficheiro final o nível a que cada identificação foi feita,
          em vez de se forçar uma espécie incerta.
        </div>

        <div className="help-note">
          Em caso de dúvida numa plântula, abre-a em detalhe (⤢). Com{" "}
          <kbd>↑</kbd>/<kbd>↓</kbd> alternas entre a foto original, a caixa e o
          recorte em alta definição; com <kbd>←</kbd>/<kbd>→</kbd> percorres as
          plântulas <b>da secção onde estavas</b> — se abriste em «Por
          classificar», só passas pelas que faltam.
        </div>

        <h2>Atalhos</h2>
        <div className="help-shortcuts">
          <div className="hs-group">
            <h3>Separador Clusters</h3>
            <dl>
              <div><dt><kbd>A</kbd></dt><dd>atribuir a seleção à espécie ativa</dd></div>
              <div><dt><kbd>S</kbd></dt><dd>selecionar a plântula que está debaixo do rato</dd></div>
              <div><dt>arrastar</dt><dd>selecionar várias de seguida na grelha</dd></div>
              <div><dt><kbd>R</kbd></dt><dd>retirar a etiqueta às selecionadas</dd></div>
              <div><dt><kbd>D</kbd></dt><dd>limpar a seleção</dd></div>
              <div><dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>atribuir a seleção à espécie n.º N (ordem do painel direito)</dd></div>
              <div><dt><kbd>C</kbd></dt><dd>marcar como <i>A confirmar</i> (identificável, mas sem certeza — para segunda opinião)</dd></div>
              <div><dt><kbd>0</kbd></dt><dd>marcar como Lixo (imagem inutilizável)</dd></div>
              <div><dt><kbd>J</kbd> / <kbd>K</kbd></dt><dd>grupo seguinte / anterior</dd></div>
              <div><dt><kbd>←</kbd> / <kbd>→</kbd></dt><dd>mudar de página</dd></div>
            </dl>
          </div>
          <div className="hs-group">
            <h3>Vista em detalhe</h3>
            <dl>
              <div><dt><kbd>↑</kbd> / <kbd>↓</kbd></dt><dd>alternar Original / Caixa / Recorte</dd></div>
              <div><dt><kbd>←</kbd> / <kbd>→</kbd></dt><dd>plântula anterior / seguinte da secção</dd></div>
              <div><dt><kbd>S</kbd></dt><dd>selecionar a plântula em vista</dd></div>
              <div><dt><kbd>F</kbd></dt><dd>localizar a plântula (nuvem de realce)</dd></div>
              <div><dt><kbd>Shift</kbd>+<kbd>F</kbd></dt><dd>centrar na plântula + localizar</dd></div>
              <div><dt><kbd>C</kbd></dt><dd>ajustar a foto inteira</dd></div>
              <div><dt>roda do rato</dt><dd>zoom (arrastar move)</dd></div>
              <div><dt>⌖ / ⟲</dt><dd>centrar na plântula / foto inteira</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>fechar</dd></div>
            </dl>
          </div>
          <div className="hs-group">
            <h3>Geral</h3>
            <dl>
              <div><dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>desfazer a última ação</dd></div>
              <div><dt><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></dt><dd>refazer</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>limpar a seleção</dd></div>
              <div><dt><kbd>?</kbd></dt><dd>abrir esta ajuda</dd></div>
            </dl>
          </div>
        </div>

        <div className="help-note">
          O trabalho fica guardado <b>neste browser</b> à medida que anotas e segue
          sozinho para a cloud pouco depois de parares. O ponto ao lado de{" "}
          <b>«Guardar na cloud»</b> diz como está: verde, está tudo enviado; se
          quiseres enviar já, carrega no botão.
        </div>
      </div>
    </div>
  );
}
