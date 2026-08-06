// REGISTO DE NOVIDADES DA FERRAMENTA ("patch notes")
//
// Porque existe: quem anota encontrava a ferramenta mudada de uma sessão para a
// outra sem contexto nenhum. Isto passa a ser a ferramenta a explicar-se, em vez
// de depender de alguém se lembrar de avisar.
//
// REGRA DE ESCRITA — não é um changelog de programador. Cada entrada diz o que
// muda NO TRABALHO DE QUEM ANOTA. Nada de commits, ficheiros ou nomes de
// componentes. Se uma linha não mudar nada para quem está a anotar, não entra.
//
// Para acrescentar uma entrada: pôr um objecto novo NO TOPO da lista. O `id` é a
// data e é o que decide se há novidades por ler (compara-se com o último id que
// a pessoa já viu, guardado em localStorage).

export type NovidadeItem = {
  titulo: string;
  texto: string;
  /** tecla associada, quando existe (mostrada como <kbd>) */
  tecla?: string;
  /**
   * Demonstração em public/novidades/ — vale mais do que o texto.
   * É MP4 e não GIF: a mesma demonstração fica ~5x mais leve, ao dobro da
   * resolução e sem o banding que a paleta de 256 cores do GIF impõe a um ecrã
   * escuro. Com autoplay/loop/muted comporta-se na mesma como um GIF.
   */
  video?: string;
  /** descrição do que se vê, para quem não consegue ver o vídeo */
  alt?: string;
};

export type Novidade = {
  /** AAAA-MM-DD — também serve de chave de "já vi isto" */
  id: string;
  /** data por extenso, como aparece no cabeçalho da entrada */
  data: string;
  titulo: string;
  /** uma frase que enquadra a entrada; opcional */
  resumo?: string;
  itens: NovidadeItem[];
};

export const NOVIDADES: Novidade[] = [
  {
    id: "2026-08-04",
    data: "4 de agosto de 2026",
    titulo: "Duas formas novas de anotar e duas de selecionar",
    resumo:
      "As duas primeiras respondem a dúvidas que foram surgindo na anotação: o que fazer a uma plântula que não se consegue identificar, e o que fazer quando a fotografia não chega para lá da família. As outras duas servem para juntar uma seleção mais depressa.",
    itens: [
      {
        titulo: "«A confirmar», para as dúvidas",
        tecla: "C",
        texto:
          "Para as plântulas em que a imagem está boa e mostra o que é preciso, e a espécie é identificável, mas fica a dúvida sobre qual é. Marcá-las com C guarda-as numa secção própria, à espera de uma segunda opinião, em vez de obrigar a uma decisão à pressa; e deixa de ser preciso reavaliá-las de cada vez que se passa pelo grupo. É diferente das outras duas hipóteses: no «Lixo» o problema é a imagem (desfocada, com duas ou mais espécies diferentes, ou apenas parte de uma planta); no nível família o problema é a fotografia não mostrar o que distingue a espécie. Aqui, o que falta é só a certeza.",
        video: "a-confirmar.mp4",
        alt: "Várias plântulas duvidosas são selecionadas e, com a tecla C, passam para a secção «A confirmar».",
      },
      {
        titulo: "Identificação ao nível da família",
        texto:
          "No painel da direita há agora um botão «+ Família», a par do «+ Espécie». Cria uma etiqueta só com o nome da família (por exemplo, Poaceae), sem código, para os casos em que a própria fotografia não mostra o que distingue a espécie. As gramíneas são o exemplo típico, porque dependem de apêndices e pelos que a imagem não capta. Fica registado o nível a que cada identificação foi feita, em vez de se forçar uma espécie incerta. Sempre que dê para chegar à família, é preferível a «A confirmar»: guarda informação em vez de a deitar fora.",
        video: "familia.mp4",
        alt: "O botão «+ Família» cria a etiqueta Poaceae, que aparece no painel com um destaque próprio.",
      },
      {
        titulo: "Arrastar seleciona várias",
        texto:
          "Arrastar o rato por cima da grelha seleciona todas as imagens por onde passa. Se começar numa que já esteja selecionada, desmarca-as em vez de marcar, seguindo a mesma regra do explorador de ficheiros do Windows.",
        video: "arrastar.mp4",
        alt: "O rato arrasta sobre a grelha e as imagens vão ficando selecionadas uma a uma.",
      },
      {
        titulo: "Selecionar sem clicar",
        tecla: "S",
        // sem demonstração: faz exactamente o mesmo que o clique, e um vídeo a
        // mostrar isso não acrescentava nada ao que a frase já diz
        texto:
          "Com o rato pousado sobre uma imagem, a tecla S seleciona-a: é o mesmo que clicar nela, mas sem tirar a mão do teclado. Percorrer a grelha e ir carregando em S é a maneira mais rápida de juntar uma seleção grande.",
      },
      {
        titulo: "A lista de grupos mostra primeiro o que falta",
        texto:
          "À esquerda, os grupos passaram a estar ordenados pelos que têm mais plântulas por anotar. Os já concluídos saem da lista e ficam recolhidos numa gaveta discreta, no fundo, e continuam a um clique de distância.",
      },
    ],
  },
];

/** A entrada mais recente. */
export const ULTIMA_NOVIDADE = NOVIDADES[0]?.id ?? "";
