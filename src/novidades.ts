// REGISTO DE NOVIDADES DA FERRAMENTA ("patch notes")
//
// Porque existe: quem anota encontrava a ferramenta mudada de uma sessão para a
// outra sem contexto nenhum. Isto passa a ser a ferramenta a explicar-se, em vez
// de depender de alguém se lembrar de avisar.
//
// REGRA DE ESCRITA: não é um changelog de programador. Cada entrada diz o que
// muda NO TRABALHO DE QUEM ANOTA. Nada de commits, ficheiros ou nomes de
// componentes. Se uma linha não mudar nada para quem está a anotar, não entra.
// Pelo mesmo critério, uma entrada agrupa TUDO o que a pessoa vai encontrar
// diferente de uma vez, mesmo que tenha sido feito em dias diferentes: as datas
// interessam a quem escreve o código, não a quem anota.
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
   * Demonstração em public/novidades/, vale mais do que o texto.
   * É MP4 e não GIF: a mesma demonstração fica ~5x mais leve, ao dobro da
   * resolução e sem o banding que a paleta de 256 cores do GIF impõe a um ecrã
   * escuro. Com autoplay/loop/muted comporta-se na mesma como um GIF.
   */
  video?: string;
  /** descrição do que se vê, para quem não consegue ver o vídeo */
  alt?: string;
};

export type Novidade = {
  /** AAAA-MM-DD, também serve de chave de "já vi isto" */
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
    data: "agosto de 2026",
    titulo: "Duas maneiras novas de anotar, e duas de selecionar mais depressa",
    resumo:
      "As duas primeiras respondem a coisas que foram aparecendo na anotação: o que fazer a uma plântula sobre a qual se fica em dúvida, e o que fazer quando a fotografia não chega para lá da família. As outras duas servem só para juntar uma seleção com menos cliques.",
    itens: [
      {
        titulo: "«A confirmar»: deixar uma dúvida para depois",
        tecla: "C",
        texto:
          "Quando a imagem está boa e mostra o que é preciso, mas fica a dúvida sobre que espécie é, deixou de ser preciso decidir na altura. A tecla C põe a plântula de lado, e ela passa a estar numa lista própria no topo da coluna da esquerda, com a contagem do que lá está. Quando quiseres, entras nessa lista e trabalha-se lá exactamente como num grupo: selecionas e atribuis, e as que ficam resolvidas saem à medida que decides. Lá dentro as plântulas estão arrumadas pelo grupo de onde vieram, o que costuma ajudar, porque as do mesmo grupo são muitas vezes a mesma espécie. E clicando no nome do grupo vais até ele com essas plântulas assinaladas, para as comparares com as vizinhas.",
        video: "a-confirmar.mp4",
        alt: "Várias plântulas duvidosas são selecionadas e, com a tecla C, passam para a lista «A confirmar» no topo da coluna da esquerda.",
      },
      {
        titulo: "Identificação ao nível da família",
        texto:
          "No painel da direita há agora um botão «+ Família», ao lado do «+ Espécie». Cria uma etiqueta só com o nome da família (por exemplo, Poaceae), para os casos em que é a própria fotografia que não mostra o que distingue a espécie. As gramíneas são o exemplo típico, porque dependem de apêndices e pelos que a imagem não capta. Fica registado o nível a que cada identificação foi feita, em vez de se forçar uma espécie incerta. Sempre que dê para chegar à família, é preferível a «A confirmar»: guarda informação em vez de a deitar fora.",
        video: "familia.mp4",
        alt: "O botão «+ Família» cria a etiqueta Poaceae, que aparece no painel com um destaque próprio.",
      },
      {
        titulo: "O lixo deixou de ser um sítio sem retorno",
        tecla: "0",
        texto:
          "O caixote passou a estar sempre à vista, no canto inferior direito, com a contagem do que lá está. Ao descartar, vê-se para onde as imagens vão. E clicando nele entra-se lá dentro: podes rever o que foi deitado fora e, se alguma coisa não devia ter ido, dás-lhe uma espécie ou mandas para «A confirmar» e ela volta ao trabalho. Dentro de cada grupo continua a haver o resumo do que ali foi descartado, agora recolhido no fim para não estar sempre à frente.",
        video: "lixo.mp4",
        alt: "As imagens descartadas com a tecla 0 voam para o caixote no canto, que mostra a contagem; ao clicar nele abre-se o que lá está.",
      },
      {
        titulo: "Arrastar seleciona várias",
        texto:
          "Arrastar o rato por cima da grelha seleciona todas as plântulas por onde passa, mesmo arrastando depressa. Se começares numa que já esteja selecionada, desmarca em vez de marcar, seguindo a mesma regra do explorador de ficheiros do Windows.",
        video: "arrastar.mp4",
        alt: "O rato arrasta sobre a grelha e as plântulas vão ficando selecionadas umas a seguir às outras.",
      },
      {
        titulo: "Selecionar sem clicar",
        tecla: "S",
        // sem demonstração: faz exactamente o mesmo que o clique, e um vídeo a
        // mostrar isso não acrescentava nada ao que a frase já diz
        texto:
          "Com o rato pousado sobre uma plântula, a tecla S seleciona-a: é o mesmo que clicar nela, mas sem tirar a mão do teclado. Percorrer a grelha e ir carregando em S é a maneira mais rápida de juntar uma seleção grande.",
      },
      {
        titulo: "A lista de grupos mostra primeiro o que falta",
        texto:
          "À esquerda, os grupos passaram a estar ordenados pelos que têm mais plântulas por anotar, e os já concluídos saem da lista para uma gaveta discreta no fundo, a um clique de distância. A ideia é abrires a ferramenta e teres à frente o que falta fazer.",
      },
    ],
  },
];

/** A entrada mais recente. */
export const ULTIMA_NOVIDADE = NOVIDADES[0]?.id ?? "";
