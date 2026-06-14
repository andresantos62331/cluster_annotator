# Cluster Annotator — Handoff de Frontend (redesign)

> Documento auto-contido para quem vai **redesenhar o frontend de raiz** sem
> conhecer o projeto. Descreve o que a aplicação faz, para quem, o modelo de
> dados, todas as funcionalidades, o layout actual e — crucial — **o que tem de
> ser preservado** (contratos de dados) vs. **o que está livre para reimaginar**
> (todo o aspecto visual e a estrutura da UI).
>
> **Idioma da UI: Português de Portugal (pt-PT), estrito.** Nada de português do
> Brasil. Todos os textos visíveis para o utilizador são em pt-PT.

---

## 1. Missão (o que isto é e para quem)

É uma ferramenta de **anotação de ground truth** usada numa tese de mestrado sobre
clustering de imagens de plantas (ervas daninhas / plântulas).

Pipeline a montante (já feito, fora do âmbito deste frontend): fotos de campo →
segmentação automática (SAM3) → **3504 recortes** de plantas individuais
("crops") → embeddings visuais (DINOv2) → **clustering** (UMAP + HDBSCAN) que
agrupa crops visualmente semelhantes.

**A utilizadora final é uma especialista botânica** ("a Dra"). O trabalho dela:
percorrer os clusters e **atribuir o nome da espécie** a cada imagem. Como o
clustering já agrupou plantas parecidas, ela pode etiquetar **em lote** (um
cluster inteiro, ou uma página de imagens, de uma vez) em vez de uma a uma. O
resultado é um dataset rotulado (ground truth) que o investigador recolhe.

**Objectivo de produto do redesign:** tornar a anotação de **milhares de imagens**
rápida, clara e o menos monótona possível. É uma ferramenta de produtividade de
alto volume, não um site institucional. Tudo o que reduza fricção e dê sentido de
progresso é ouro.

Site actual (a substituir visualmente): `https://clusterannotator.afse-santos.workers.dev`

---

## 2. Modelo mental do domínio (vocabulário)

- **Crop / planta** — uma imagem recortada de uma planta individual. Identificada
  por um `filename` (ex.: `20220417_141317_planta_0.jpg`). Há 3504.
- **Cluster** — grupo de crops visualmente semelhantes. Tem um `cluster_id`
  inteiro. O cluster especial **`-1` é "ruído"** (crops que o algoritmo não
  conseguiu agrupar).
- **Config (A–D)** — há **4 versões alternativas do clustering**, da mais granular
  (muitos clusters pequenos) à mais agrupada (poucos clusters grandes). A
  utilizadora escolhe qual usar. Nomes fixos (tema "escala de zoom"):
  - **A — Microscópio** (mais granular)
  - **B — Detalhe**
  - **C — Padrão**
  - **D — Panorama** (mais agrupada)
  Cada config tem parâmetros técnicos (ex.: `leaf · mcs=5 ms=3 · nn=10 nc=10`) que
  **só interessam ao autor/orientadores**, não à Dra — mostram-se de forma
  discreta (atalho visual secundário), nunca em destaque.
- **Geração (G0, G1, G2, …)** — o ruído de cada config foi **reclusterizado
  iterativamente**: a 1ª passagem dá os clusters G0; reclusterizar o ruído dá
  novos clusters (G1) + novo ruído; repete-se (G2, G3…). Cada cluster sabe de que
  geração nasceu (coluna `origem`). **G0 = inicial (sem badge)**; G1+ mostram um
  **badge "G1"/"G2"…** com cor a escurecer com a profundidade. Comunica "este
  grupo foi recuperado do ruído na enésima passagem".
- **Espécie / label / ground truth** — o nome que a Dra atribui a uma imagem
  (ex.: "Amaranthus"). É o output do trabalho. Uma imagem tem 0 ou 1 espécie.

---

## 3. Contratos de dados (O QUE NÃO PODE MUDAR sem coordenar)

O frontend é **estático + local-first**. Lê CSVs do servidor e guarda o trabalho
no browser. Estes formatos são contratos: o pipeline a montante produz-os e o
investigador consome o output. Mudar formatos implica mudar scripts Python e o
Worker — possível, mas tem de ser combinado, não assumido.

> **Actualização 2026-06-14 (taxonomia EPPO + sync).** O modelo cresceu; o que
> mudou face ao descrito abaixo:
> - **Códigos EPPO + família por espécie.** Vocabulário offline curado em
>   `/<base>/eppo.json` (`[{code,name,family,common_pt}]`). localStorage ganhou
>   `tese3.species_eppo` (`{label→code}`) e `tese3.species_family` (`{label→family}`,
>   override; senão a família deriva do código via o vocabulário). São auxílio +
>   output: **entram** no export/cloud (ao contrário das cores).
> - **Export.** CSV passou a `filename,label,eppo_code`. JSON ganhou os mapas
>   `eppo` e `family` (além de `labels` e `ground_truth`). Import lê-os (ausência
>   = retrocompatível).
> - **Cloud bidirecional.** Além do `POST /api/save`, há `GET /api/load?k=<KEY>`
>   (mesma SAVE_KEY) que devolve o `ground_truth.json` da branch `data`. No arranque
>   a app puxa (auto se local vazio; senão banner). Há **autosave** (debounce 20s +
>   flush ao esconder o separador).
> - **Tabs.** A tab central deixou de se chamar "Espécies" e passou a **"Coleção"**
>   (resumo/dashboard + fichas agrupadas por família); o painel direito continua
>   "Espécies". O **Lixo** é uma categoria reservada (entra no ground truth como
>   etiqueta "Lixo") mas apresenta-se como caixote distinto, nunca como espécie.

### 3.1 Imagens (servidas como assets estáticos)
- `/<base>/crops/<filename>` — **thumbnail 224×224** (letterbox). ~27 MB, 3504
  ficheiros. Usado nas grelhas (cards).
- `/<base>/plants/<filename>` — **imagem em resolução real** (bounding box
  original). ~140 MB, 3609 ficheiros. Usado só no lightbox (zoom). O `filename` é
  o mesmo nos dois sítios.
- Carregamento **lazy** é obrigatório (milhares de imagens). Usar `loading="lazy"`
  ou virtualização.

### 3.2 CSVs de clustering (em `/<base>/configs/`)
Por cada config há 2 ficheiros. Nomes **estáveis** (a filtragem futura por geração
reescreve-os com o mesmo nome):

`A_microscopio.csv`, `B_detalhe.csv`, `C_padrao.csv`, `D_panorama.csv`
(+ os respectivos `*_metrics.csv`).

**Assignments** (`<config>.csv`) — uma linha por crop:
```
crop_id,filename,cluster_id,origem
20220417_141317_planta_0,20220417_141317_planta_0.jpg,217,1
```
- `cluster_id`: inteiro; **`-1` = ruído**.
- `origem`: geração do cluster (`0` = G0/inicial, `1`,`2`,… ; nas linhas de ruído
  vem `-1`).

**Metrics** (`<config>_metrics.csv`) — uma linha por cluster (+ uma linha `-1`):
```
cluster_id,size,cohesion_mean,cohesion_min,separation,nearest_cluster,persistence,origem
217,34,0.8225,0.6482,0.0519,97.0,0.2051,1
-1,11,,,,,,-1            (linha do ruído: métricas vazias)
```
Significado das métricas (para microcopy / tooltips; valores típicos entre []):
- `size` — nº de imagens no cluster.
- `cohesion_mean` / `cohesion_min` — quão "apertado" é o cluster (similaridade ao
  centróide). Mais alto = mais coeso. [~0.6–0.95]
- `separation` — distância ao cluster vizinho mais próximo. Mais alto = mais
  distinto. [~0.05–0.15]
- `nearest_cluster` — `cluster_id` do vizinho mais parecido.
- `persistence` — estabilidade do cluster no HDBSCAN. [~0.0–0.35]
- `origem` — geração (ver acima).

> Os números de clusters por config variam (e mudarão com a filtragem). **Não
> hardcodar contagens** — derivar sempre dos dados carregados.

### 3.3 Estado guardado no browser (localStorage)
- `tese3.ground_truth` → `{ [filename]: speciesLabel }`. **Chave = filename**, por
  isso o ground truth é **partilhado entre as 4 configs** (são as mesmas imagens).
  Trocar de config **não** perde anotações.
- `tese3.labels` → `string[]` (lista de espécies criadas).
- `tese3.species_colors` → `{ [label]: indiceNaPaleta }`. Cor estável por espécie,
  **não se apaga ao remover a espécie** (para a Dra memorizar espécie↔cor).
- `tese3.cloud_key` → chave de gravação na cloud (ver 3.4).

### 3.4 Gravar na cloud (link mágico + Worker)
- A Dra recebe um link `…/?k=<SAVE_KEY>`. No arranque, o frontend lê `?k=`,
  guarda em `tese3.cloud_key` e **limpa o parâmetro do URL**.
- Botão "Guardar na cloud" → `POST /api/save` com
  `{ key, json, csv, count }`. O Worker valida a `key` e faz **commit** do
  `ground_truth.json` e `.csv` numa branch `data` do GitHub (o PAT vive como
  secret do Worker, nunca chega ao browser). Resposta: `{ ok, count, commit }`
  ou `{ error }`.
- **Local-first**: o localStorage é a fonte instantânea; o cloud-save é um push
  explícito. Tem de continuar a funcionar offline (sem chave → mostrar aviso, não
  rebentar).

### 3.5 Formatos de export (o investigador consome — não mudar)
- **JSON**: `{ exported_at, labels, ground_truth }` (indentado).
- **CSV**: cabeçalho `filename,label`, uma linha por crop (label vazio se não
  anotado). Inclui **todos** os filenames, não só os anotados.

---

## 4. Inventário de funcionalidades (tudo o que existe hoje)

Tem de existir equivalente funcional no redesign (a forma é livre).

**Globais**
1. Selector de **config** (A–D). Trocar recarrega os clusters; mantém o ground
   truth.
2. Mostrar os **parâmetros técnicos** da config de forma discreta.
3. **Progresso global**: barra + "X / 3504 anotadas".
4. **Gestor de espécies**: criar (input + Enter), **renomear** (propaga a todas as
   anotações dessa espécie), **remover** (com confirmação; limpa as anotações
   dessa espécie). Cada espécie tem **cor** e contagem de imagens.
5. **Lista de clusters** (navegação): cada item mostra nome (`c<id>` ou
   `ruído (-1)`), **badge de geração** G1/G2…, contagem `anotadas/total`, barra de
   progresso individual, e estado "concluído" (✓, esbatido) quando 100% anotado.
   **Ordem: por geração ascendente (G0→G1→G2…), tamanho desc dentro de cada,
   ruído sempre no fim.**
6. **Export JSON / CSV** (download local) e **Import JSON** (repõe ground truth +
   espécies). **Guardar na cloud**.

**Separador "Clusters"** (vista principal de trabalho)
7. Cabeçalho do cluster: título + badge de geração + **métricas** (size, anotadas,
   por anotar, cohesion, separation, persistence, vizinho mais próximo).
8. **Barra de acções**: escolher espécie · **Atribuir à selecção [A]** ·
   Selecionar/desselecionar página · Selecionar/desselecionar "por classificar" ·
   **Limpar selecção [D]** · checkbox **"Mostrar anotadas"** · contador de
   selecção.
9. Bloco **"Por classificar"**: grelha das imagens ainda sem espécie, **paginada a
   30/página**. Clicar num card alterna a selecção. Botão de lupa abre o lightbox.
10. Blocos **por espécie** (as já anotadas neste cluster), cada um com a cor da
    espécie, mostrados abaixo (escondíveis com "Mostrar anotadas").

**Separador "Espécies"** (vista invertida)
11. Um bloco por espécie com **todas as imagens anotadas com ela** (em qualquer
    cluster), paginado. Permite **selecionar em lote e remover labels**
    (corrigir erros). Útil para auditar uma espécie inteira.

**Lightbox (examinar imagem)**
12. Abre a imagem em **resolução real** (`plants/`). **Pan & zoom** (scroll =
    zoom, drag = pan), botões +/−/reset, **fit-to-viewport** ao abrir, mostra
    dimensões naturais (px) e o filename/espécie. Fecha com **Esc** ou clique fora.

**Atalhos de teclado**
13. `A` atribuir · `D` limpar selecção · `←`/`→` paginar · `J`/`K` cluster
    seguinte/anterior · `Esc` fechar lightbox. (Ignorados quando o foco está em
    input/select.)

---

## 5. Layout actual (referência — livre de redesenhar)

Desktop, duas colunas. **Tema escuro.**

```
┌────────────────────────┬───────────────────────────────────────────────┐
│ SIDEBAR (320px, fixa)  │ MAIN                                           │
│                        │                                                │
│ CLUSTERING             │ [ Clusters ] [ Espécies ]   <- tabs            │
│  ┌── select A–D ──┐    │ ───────────────────────────────────────────── │
│  leaf · mcs=5 …(dim)   │ Cluster 217  [G1]                              │
│  321 clusters · 11 r.  │ size 34 · anotadas 5 · por anotar 29 ·         │
│                        │ cohesion 0.82 · separation 0.05 · …            │
│ PROGRESSO GLOBAL       │                                                │
│  ▓▓▓▓░░░░  812/3504    │ ┌ barra de acções ───────────────────────────┐│
│                        │ │ [espécie ▾] [Atribuir a 7 [A]] [Sel.página] ││
│ ESPÉCIES               │ │ [Sel. por classificar] [Limpar [D]] ☑mostrar││
│  + [ Amaranthus… ]     │ └─────────────────────────────────────────────┘│
│  ● Amaranthus    128 × │                                                │
│  ● Chenopodium    74 × │ ── Por classificar ───────────────────── 29   │
│                        │ ┌────┬────┬────┬────┬────┐                     │
│ CLUSTERS  (scroll)     │ │img │img │img │img │img │  grelha auto-fill   │
│  c12     ▓▓▓░  4/120   │ ├────┼────┼────┼────┼────┤  (min 150px)        │
│  c5      ▓░░░  2/88    │ │ …                                            │
│  …(G0)                 │                                                │
│  c217 [G1] ▓░  1/34    │ ── ● Amaranthus ───────────────────────── 5   │
│  c260 [G1] …           │ ┌────┬────┬────┐  (anotadas, com cor)          │
│  c295 [G2] …           │ │img │img │img │                              │
│  ruído (-1)   0/11     │                                                │
│                        │ atalhos: [A] atribuir · [D] limpar · …         │
│ EXPORTAR / IMPORTAR    │                                                │
│  [Export JSON][CSV]    │                                                │
│  [Import JSON]         │                                                │
│  [Guardar na cloud]    │                                                │
└────────────────────────┴───────────────────────────────────────────────┘
        (lightbox = overlay full-screen por cima de tudo, ao abrir)
```

**Paleta/tipo actuais** (apenas referência; podem ser totalmente substituídos):
fundo `#0e0f12`, painéis `#16181d`/`#1f222a`, bordas `#262a32`, texto `#e7e9ee`,
secundário `#9aa1ad`/`#6b7280`, selecção (azul) `#7aa2f7`, ruído (âmbar)
`#d8a657`, perigo `#e06c75`. Fonte sans system-ui; **mono** para ids/números.
Cards: thumbnail quadrado (`object-fit: contain` sobre preto), anel azul quando
seleccionado, pill com a cor da espécie quando anotado, "stem" (últimos chars do
filename) por baixo. Badge de geração: escala âmbar a escurecer
(`#fcd34d`→`#78350f`).
Paleta de espécies: **36 cores distintas** atribuídas por ordem estável.

---

## 6. Pontos de fricção / oportunidades (para guiar o redesign)

Não são bugs; são onde um frontend melhor faria diferença real:
- **Volume e monotonia**: 3504 imagens. O fluxo "ver cluster → selecionar tudo →
  atribuir" deve ser ultra-rápido e gratificante (feedback claro, micro-animações,
  sentido de progresso por cluster e global). Pensar em **fluxo keyboard-first**.
- **Decisão rápida por imagem**: a Dra precisa de ver bem a planta. O thumbnail
  224² às vezes não chega; o lightbox é o único sítio com detalhe — talvez um
  modo de **preview maior / hover-zoom** ajude.
- **Memória espécie↔cor**: as cores estáveis por espécie são um apoio cognitivo
  importante — manter e talvez reforçar.
- **Orientação nos clusters**: hoje a lista é textual. Um **preview/thumbnail
  representativo** por cluster na sidebar ajudaria a Dra a saltar para o que
  interessa.
- **Estados de carregamento** de milhares de imagens (skeletons, virtualização).
- **Confiança no salvar**: deixar claríssimo o que está guardado localmente vs.
  enviado para a cloud (a Dra não pode ter medo de perder trabalho).
- Provavelmente **desktop-only** (trabalho intensivo), mas não partir layout em
  ecrãs mais pequenos.

---

## 7. O que PRESERVAR vs. o que está LIVRE

**Preservar (contratos):**
- Carregar clusters dos CSVs em `/configs/` com as colunas da secção 3.2.
- Imagens em `crops/` (grelha) e `plants/` (lightbox), por `filename`.
- Ground truth **keyed por filename**, partilhado entre configs; chaves de
  localStorage (ou migração explícita).
- Cloud-save: `POST /api/save` `{key,json,csv,count}` + link mágico `?k=`.
- Formatos de export JSON/CSV (secção 3.5).
- **UI em pt-PT**; nomes das 4 configs; conceito de geração + badges G1/G2…
- Comportamentos da secção 4 (anotação em lote, separadores Clusters/Espécies,
  lightbox com zoom, atalhos, mostrar/esconder anotadas, progresso).

**Livre para reimaginar:**
- Todo o aspecto visual (cores, tipografia, espaçamento, ícones, animações).
- Estrutura/disposição da UI (não tem de ser sidebar + 2 tabs).
- Biblioteca de componentes / framework de estilos.
- Como se mostram métricas, badges, progresso, previews de cluster.
- Fluxo de interacção, desde que as capacidades da secção 4 existam.

---

## 8. Stack & deploy actuais (contexto técnico)

- **Vite + React 19 + TypeScript**, sem framework de UI, CSS simples
  (`src/index.css`). Única dependência de runtime relevante:
  `react-zoom-pan-pinch` (zoom do lightbox). Livre de trocar stack.
- **Ficheiros-chave** (hoje): `src/App.tsx` (app inteira + subcomponentes),
  `src/loader.ts` (defs das 4 configs + parsing CSV → estado), `src/types.ts`,
  `src/storage.ts` (localStorage + export + cloud), `src/csv.ts` (parser CSV
  minimal), `src/colors.ts` (paleta + cor de geração), `worker.ts` (Cloudflare
  Worker: serve assets + `POST /api/save`).
- **Deploy**: Cloudflare **Workers** com static assets (`wrangler.jsonc`:
  `assets.directory = ./dist`, `not_found_handling = single-page-application`).
  Build `tsc -b && vite build` → `dist/`. **Auto-deploy a cada push** para `main`
  no repo `github.com/andresantos62331/cluster_annotator`. Secrets do Worker
  (`GITHUB_TOKEN`, `SAVE_KEY`) no dashboard, preservados por `keep_vars: true`.
- O `POST /api/save` é a única rota dinâmica; tudo o resto são assets estáticos
  com fallback SPA. Se o redesign mantiver a mesma origem, o Worker pode ficar
  como está (só muda o `dist/`).
- **Dados pesados**: `crops/` 27 MB, `plants/` 140 MB no edge. Manter `lazy`.

---

## 9. Resumo de uma frase

Ferramenta desktop, dark, local-first, para uma botânica **etiquetar em lote**
milhares de recortes de plantas pré-agrupados em clusters (4 granularidades A–D,
com clusters "recuperados do ruído" marcados por geração G1/G2…), construindo um
ground truth de espécies que se exporta e se grava na cloud com um clique — e o
desafio do redesign é tornar esse trabalho de alto volume **rápido, claro e
agradável**.
