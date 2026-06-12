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
            <b>Escolhe um grupo</b> na lista à esquerda. As imagens do grupo são
            parecidas entre si — normalmente a mesma espécie.
          </li>
          <li>
            <b>Seleciona as plântulas</b> clicando nelas (ou «Selecionar página») e
            atribui-as à espécie ativa com <kbd>A</kbd> ou o botão «Atribuir».
            Para criar uma espécie nova usa o painel à direita.
          </li>
          <li>
            <b>Audita na página Espécies</b>: clica numa espécie no painel direito
            para veres todas as imagens dela e corrigires as que não pertencem
            («Mover para» ou «Remover etiqueta»).
          </li>
        </ol>

        <div className="help-note">
          Em caso de dúvida numa plântula, expande-a (⤢) — vês a foto original e,
          com <kbd>←</kbd>/<kbd>→</kbd>, a caixa e o recorte em alta definição.
        </div>

        <h2>Atalhos</h2>
        <div className="help-shortcuts">
          <div className="hs-group">
            <h3>Separador Clusters</h3>
            <dl>
              <div><dt><kbd>A</kbd></dt><dd>atribuir a seleção à espécie ativa</dd></div>
              <div><dt><kbd>R</kbd></dt><dd>retirar a etiqueta às selecionadas</dd></div>
              <div><dt><kbd>D</kbd></dt><dd>limpar a seleção</dd></div>
              <div><dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>escolher/atribuir a espécie n.º N</dd></div>
              <div><dt><kbd>0</kbd></dt><dd>marcar como Lixo (crop inutilizável)</dd></div>
              <div><dt><kbd>J</kbd> / <kbd>K</kbd></dt><dd>grupo seguinte / anterior</dd></div>
              <div><dt><kbd>←</kbd> / <kbd>→</kbd></dt><dd>mudar de página</dd></div>
            </dl>
          </div>
          <div className="hs-group">
            <h3>Vista em detalhe</h3>
            <dl>
              <div><dt><kbd>↑</kbd> / <kbd>↓</kbd></dt><dd>alternar Original / Caixa / Recorte</dd></div>
              <div><dt><kbd>←</kbd> / <kbd>→</kbd></dt><dd>plântula anterior / seguinte</dd></div>
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
              <div><dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>desfazer a última anotação</dd></div>
              <div><dt><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></dt><dd>refazer</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>limpar a seleção</dd></div>
              <div><dt><kbd>?</kbd></dt><dd>abrir esta ajuda</dd></div>
            </dl>
          </div>
        </div>

        <div className="help-note">
          As anotações ficam guardadas <b>neste browser</b> ao instante. No fim da
          sessão carrega em <b>«Guardar na cloud»</b> para enviar uma cópia segura.
        </div>
      </div>
    </div>
  );
}
