// Ajuda integrada (botão "?" na barra superior ou tecla ?): fluxo de anotação
// em 3 passos + onde estão as coisas + tabela de atalhos. Pensada para a
// anotadora usar a ferramenta sem ninguém ao lado. Fecha com Esc (gerido no
// App), X ou clique fora.
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
            <b>Escolhe um grupo</b> na lista da esquerda. As plântulas de cada grupo
            são parecidas entre si, em regra a mesma espécie. A lista mostra primeiro
            os grupos com mais por fazer; os já concluídos ficam recolhidos na gaveta{" "}
            <b>«Concluídos»</b>, no fundo.
          </li>
          <li>
            <b>Seleciona as plântulas</b> que são da mesma espécie e atribui-as com{" "}
            <kbd>A</kbd>, com o botão «Atribuir» ou com a tecla da espécie. Para
            selecionar tens três maneiras: clicar em cada uma, <b>arrastar por cima
            de várias</b> (arrancar numa que já esteja selecionada desmarca, como no
            explorador de ficheiros), ou carregar em <kbd>S</kbd> com o rato pousado
            numa plântula, sem clicar. O visto no cabeçalho marca a página inteira.
            Espécies novas criam-se no painel da direita.
          </li>
          <li>
            <b>Confere na Coleção</b>: o separador do meio reúne, para cada espécie,
            todas as plântulas que lhe atribuíste, venham do grupo que vierem. É aqui
            que se apanham enganos: corrige-os com «Mover para» ou «Retirar etiqueta».
          </li>
        </ol>

        <h2>Onde está cada coisa</h2>
        <div className="help-note">
          <b>À esquerda</b>, os sítios para onde ir: os grupos por fazer e, no topo,
          a lista <b>«A confirmar»</b> com as plântulas que deixaste para depois.
          <br />
          <b>À direita</b>, as identificações, ou seja o que a plântula é: espécies e
          famílias. O painel está recolhido e abre quando lhe passas o rato por cima.
          Os números a laranja são as teclas de atribuição, e arrastar uma espécie
          muda a ordem e, com ela, as teclas. O lápis abre a ficha: nome, código EPPO,
          família e nível da identificação.
          <br />
          <b>No canto inferior direito</b>, o caixote do lixo, com a contagem do que
          lá está. Clica para ver o que foi descartado e, se for preciso, recuperar.
        </div>

        <h2>Quando não se consegue identificar</h2>
        <div className="help-note">
          Há três situações diferentes, e a distinção entre elas é o que dá valor ao
          ficheiro final. O que muda é <b>onde está o problema</b>.
          <br />
          <br />
          <b>A confirmar</b> <kbd>C</kbd>: a imagem está boa e mostra o que é preciso,
          a espécie <b>é</b> identificável, e o que falta é a <b>certeza</b>. Marca
          aqui as plântulas em que ficas em dúvida, para decidires mais tarde em vez
          de decidires à pressa. Ficam guardadas na lista do topo da esquerda, e
          deixas de reavaliar a mesma plântula de cada vez que passas pelo grupo.
          <br />
          <br />
          <b>Família</b>: a dúvida existe porque a <b>fotografia</b> não mostra o que
          distingue a espécie (as gramíneas dependem de apêndices e pelos que a imagem
          não capta). Aqui não há certeza a ganhar, por mais que se olhe, por isso
          regista-se a família. Sempre que dê para chegar à família, é preferível a
          «A confirmar»: guarda informação em vez de a deitar fora.
          <br />
          <br />
          <b>Lixo</b> <kbd>0</kbd>: o problema é a <b>imagem</b>, que não serve.
          Desfocada, com duas ou mais espécies diferentes, ou apenas parte de uma
          planta.
        </div>

        <h2>Criar uma espécie ou uma família</h2>
        <div className="help-note">
          No painel da direita há dois botões de criação.
          <br />
          <b>+ Espécie</b>: o caso normal. Escreve o nome e escolhe da lista, e o
          código EPPO e a família ficam preenchidos sozinhos.
          <br />
          <b>+ Família</b>: só pede o nome (por exemplo, <i>Poaceae</i>), sem código.
          Fica registado no ficheiro final o nível a que cada identificação foi feita,
          em vez de se forçar uma espécie incerta.
        </div>

        <div className="help-note">
          Em caso de dúvida numa plântula, abre-a em detalhe (⤢). Com{" "}
          <kbd>↑</kbd>/<kbd>↓</kbd> alternas entre a foto original, a caixa e o
          recorte em alta definição; com <kbd>←</kbd>/<kbd>→</kbd> percorres as
          plântulas <b>da secção onde estavas</b>. Se abriste em «Por anotar», só
          passas pelas que faltam.
        </div>

        <h2>Atalhos</h2>
        <div className="help-shortcuts">
          <div className="hs-group">
            <h3>Separador Grupos</h3>
            <dl>
              <div><dt><kbd>A</kbd></dt><dd>atribuir a seleção à espécie ativa</dd></div>
              <div><dt><kbd>S</kbd></dt><dd>selecionar a plântula que está debaixo do rato</dd></div>
              <div><dt>arrastar</dt><dd>selecionar várias de seguida na grelha</dd></div>
              <div><dt><kbd>R</kbd></dt><dd>retirar a etiqueta às selecionadas</dd></div>
              <div><dt><kbd>D</kbd></dt><dd>limpar a seleção</dd></div>
              <div><dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>atribuir a seleção à espécie n.º N (ordem do painel direito)</dd></div>
              <div><dt><kbd>C</kbd></dt><dd>pôr de lado como <i>A confirmar</i></dd></div>
              <div><dt><kbd>0</kbd></dt><dd>descartar para o Lixo</dd></div>
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
