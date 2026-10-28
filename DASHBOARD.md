# Dashboard das TVs

Como funciona o dashboard público que roda nas TVs: o que cada arquivo faz, como as peças se encaixam e por que foram feitas dessa forma.

O código não tem comentários de propósito. Toda explicação fica neste documento.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Camadas e fluxo de dados](#3-camadas-e-fluxo-de-dados)
4. [Rotas](#4-rotas)
5. [Carrossel de telas](#5-carrossel-de-telas)
6. [Camada de API](#6-camada-de-api)
7. [Mocks](#7-mocks)
8. [Hooks](#8-hooks)
9. [Atualização em tempo real (SSE) e popup de venda](#9-atualização-em-tempo-real-sse-e-popup-de-venda)
10. [Componentes](#10-componentes)
11. [Telas](#11-telas)
12. [Utilitários](#12-utilitários)
13. [Estilos, medidas e imagens](#13-estilos-medidas-e-imagens)
14. [Testes](#14-testes)
15. [Como adicionar uma tela nova](#15-como-adicionar-uma-tela-nova)
16. [Pendências](#16-pendências)

---

## 1. Visão geral

O dashboard é a página principal do app (`/`). Ele não exige login e mostra 8 telas em sequência, trocando a cada 15 segundos com um fade suave:

| # | Tela | Dados |
|---|---|---|
| 1 | Meta Black | `GET /analytics/goal` |
| 2 | Ranking de equipes · Semanal | `GET /analytics/scoreboard?period=week` |
| 3 | Ranking de equipes · Geral acumulado | `GET /analytics/scoreboard?period=all` |
| 4 | Ranking de artilheiros · Farmer semanal | `GET /analytics/ranking?period=week&vendorDepartment=farm` |
| 5 | Ranking de artilheiros · Vendas semanal | `GET /analytics/ranking?period=week&vendorDepartment=sales` |
| 6 | Ranking de artilheiros · Farmer geral | `GET /analytics/ranking?period=all&vendorDepartment=farm` |
| 7 | Ranking de artilheiros · Vendas geral | `GET /analytics/ranking?period=all&vendorDepartment=sales` |
| 8 | Ranking de assistências | `GET /analytics/sdr-ranking?period=all` |

A volta completa leva 2 minutos (8 × 15s).

Os dados chegam por dois caminhos:
- **SSE** (`/sales/events`): quando entra ou cai uma venda, todas as telas buscam os dados de novo e os rankings se reorganizam na hora.
- **Refetch a cada 60s**: funciona como garantia caso algum evento do SSE se perca.

Quando o evento é de **venda nova**, um popup em tela cheia mostra a venda. Primeiro roda o vídeo `public/sale-video.mp4`, se ele existir. Depois aparece o outdoor com o vendedor, "+1 VENDA" (ou "+1 RENOVAÇÃO" para farmer) e, se houve passagem, as assistências (uma ou mais pessoas), por 10 segundos. Vendas que chegam juntas entram numa fila e aparecem uma de cada vez, na ordem de chegada. O carrossel fica pausado enquanto o popup está na tela.

Se uma tela quebrar, só ela mostra "Ops, algo deu errado", com o erro e o local, e o erro aparece no admin. Detalhes em [ERROS_E_LOGS.md](ERROS_E_LOGS.md).

```
Router "/"
  └── DashboardPage                 carrossel + fade + conexão SSE
        ├── GoalScreen              → useGoal          → getGoal          → /analytics/goal
        │     └── GoalProgress
        ├── TeamRankingScreen ×2    → useScoreboard    → getScoreboard    → /analytics/scoreboard
        │     └── RankingLayout + Podium + TeamCard
        ├── ScorerRankingScreen ×4  → useVendorRanking → getVendorRanking → /analytics/ranking
        │     └── RankingLayout + Podium + PlayerCard
        └── AssistRankingScreen     → useSdrRanking    → getSdrRanking    → /analytics/sdr-ranking
              └── RankingLayout + Podium + PlayerCard

        useSalesEvents → subscribeToSalesEvents → EventSource /sales/events
              ├── a cada evento: invalida ["scoreboard"], ["ranking"] e ["goal"]
              └── venda nova: useSaleQueue (fila FIFO) → SalePopup (vídeo → outdoor 10s) → próxima
```

---

## 2. Estrutura de pastas

Segue o [GUIA_FEATURES.md](GUIA_FEATURES.md): tudo que é do dashboard fica em `features/dashboard/`.

```
src/
├── app/
│   ├── Router.jsx                      "/" = dashboard, "/login" = login, "/admin" = admin
│   └── PrivateRoute.jsx                redireciona para "/login" quando não há sessão
├── features/dashboard/
│   ├── api/
│   │   └── dashboardApi.js             requisições HTTP e SSE (sem React)
│   ├── hooks/
│   │   ├── dashboardKeys.js            query keys e intervalo de refetch
│   │   ├── useGoal.js
│   │   ├── useScoreboard.js
│   │   ├── useVendorRanking.js
│   │   ├── useSdrRanking.js
│   │   ├── useSalesEvents.js
│   │   ├── useSaleQueue.js             fila FIFO do popup de venda
│   │   └── useSaleVideo.js             checa se o vídeo do popup existe
│   ├── components/
│   │   ├── SalePopup/                  popup de venda nova em tela cheia
│   │   ├── GoalProgress/               barra de progresso da meta
│   │   ├── RankingLayout/              título, subtítulo, logo e carregamento das telas de ranking
│   │   ├── Podium/                     lista dos 3 colocados
│   │   ├── TeamCard/                   card de time
│   │   └── PlayerCard/                 card de pessoa (vendedor ou SDR)
│   ├── screens/                        telas do carrossel (não têm rota)
│   │   ├── GoalScreen/
│   │   ├── TeamRankingScreen/
│   │   ├── ScorerRankingScreen/
│   │   └── AssistRankingScreen/
│   ├── pages/
│   │   └── DashboardPage/              a única página com rota: o carrossel
│   └── utils/
│       └── sortDescBy.js
├── shared/utils/formatCurrency.js      formato R$ (usado também pelo admin)
└── test/
    ├── setup.js
    └── renderWithQuery.jsx
```

### Por que existe `screens/`

No guia do projeto, `pages/` são componentes ligados a uma rota no `Router.jsx`. As telas do carrossel não têm rota: elas são renderizadas dentro do `DashboardPage`. Separar as duas pastas deixa claro que só o `DashboardPage` está no Router, e que uma tela de `screens/` não deve ser acessada sozinha.

### Por que `formatCurrency` está em `shared/` e `sortDescBy` não

O guia manda subir para `shared/` só o que duas ou mais features usam. A formatação em R$ serve ao dashboard e à listagem de vendas do admin. A ordenação só é usada pelos hooks do dashboard, então fica em `features/dashboard/utils/`.

---

## 3. Camadas e fluxo de dados

Cada camada só conversa com a de baixo:

| Camada | Arquivos | Responsabilidade | Usa React? |
|---|---|---|---|
| API | `dashboardApi.js` | Fazer a requisição, tirar o envelope da resposta, padronizar o formato e decidir entre mock e backend | Não |
| Hook | `use*.js` | Cache, refetch e ordenação com React Query | Sim |
| Tela | `screens/*` | Montar a tela: título, qual hook usar, qual card mostrar | Sim |
| Componente | `components/*` | Só desenhar o que recebe por props | Sim, sem buscar dados |

**Por que separar assim:**
- **Componentes não buscam dados.** Eles recebem tudo por props, então dá para reaproveitar o `PlayerCard` no admin, testá-lo sem API e trocar a origem dos dados sem mexer no visual.
- **A API não sabe de React.** Ela pode ser testada com um `api.get` falso e é o único lugar que conhece URLs e o formato do backend.
- **O formato do backend morre na camada de API.** Cada rota responde de um jeito: o placar vem como lista, o ranking de vendedores vem dentro de `data.vendor`, e cada item tem o id com um nome diferente (`teamId`, `vendorId`, `sdrId`). A API entrega sempre uma lista em que todo item tem `id`. O resto do app não precisa saber dessas diferenças.

---

## 4. Rotas

[src/app/Router.jsx](src/app/Router.jsx)

| Rota | Elemento | Proteção |
|---|---|---|
| `/` | `DashboardPage` | Nenhuma |
| `/admin` | `PrivateRoute` → `AdminPanel` | Só com sessão |
| `/login` | `PublicRoute` → `LoginPage` | Só sem sessão |

**Por que o dashboard fica fora do `PublicRoute`:** o `PublicRoute` manda quem está logado para `/admin`. Se alguém fizesse login no navegador da TV, o dashboard sumiria. Fora de qualquer guard, ele abre sempre.

**Por que o login saiu de `/`:** o dashboard passou a ser a página principal. O [PrivateRoute.jsx](src/app/PrivateRoute.jsx) passou a redirecionar para `/login` quando não há sessão.

---

## 5. Carrossel de telas

### 5.1 `DashboardPage`

[src/features/dashboard/pages/DashboardPage.jsx](src/features/dashboard/pages/DashboardPage.jsx)

**`SCREENS`**: lista das telas, na ordem em que aparecem. Cada item tem:

| Campo | Para que serve |
|---|---|
| `id` | Nome único da tela. É a `key` do React e o `data-testid` usado nos testes |
| `Screen` | O componente da tela. Precisa começar com letra maiúscula: o JSX só trata como componente o que começa com maiúscula |
| `props` | Opcional. Configura a tela. É o que permite usar o mesmo `ScorerRankingScreen` quatro vezes, com `period` e `department` diferentes |

**`ROTATION_INTERVAL`**: 15 segundos.

**`DashboardPage()`**:
1. `activeIndex` guarda qual tela está visível.
2. `useSalesEvents()` abre **uma** conexão SSE para todas as telas.
3. O `useEffect` cria um `setInterval` que avança o índice a cada 15s:
   - `(current + 1) % SCREENS.length` volta para a primeira tela depois da última.
   - O `setActiveIndex` usa a forma com função (`current => ...`). Como o effect roda uma vez só, uma variável lida direto ficaria congelada no valor inicial; a função sempre recebe o valor atual.
   - O `return () => clearInterval(...)` desliga o timer quando a página sai da tela.
   - Com menos de 2 telas, o timer nem é criado.
4. Renderiza **todas** as telas ao mesmo tempo, cada uma dentro de um `div.slide`. Só a ativa recebe `.active`. As outras recebem `aria-hidden`, para leitores de tela ignorarem o que não está visível.
5. `<Screen {...props} />` espalha o objeto `props` como props do componente. `{ period: "week" }` vira `period="week"`. Quando `props` é `undefined`, como na meta, não acontece nada.

**Por que todas as telas ficam montadas:**
- Quando uma tela aparece, os dados dela já foram buscados. O "Carregando..." nunca surge no meio da transição.
- As telas escondidas continuam recebendo SSE e refetch, então chegam à frente já atualizadas.
- O custo é baixo: são 8 telas simples, e as requisições são poucas e leves.

### 5.2 O fade sem piscar

[src/features/dashboard/pages/DashboardPage.module.css](src/features/dashboard/pages/DashboardPage.module.css)

```css
.slide  { position: absolute; inset: 0; opacity: 0; visibility: hidden;
          transition: opacity 0s linear 1.2s, visibility 0s linear 1.2s; }
.active { z-index: 1; opacity: 1; visibility: visible;
          transition: opacity 1.2s ease-in-out; }
```

- `position: absolute; inset: 0` empilha todas as telas no mesmo lugar, em tela cheia.
- **Tela que entra** (ganha `.active`): fica por cima (`z-index: 1`) e a opacidade sobe de 0 a 1 em 1.2s.
- **Tela que sai** (perde `.active`): volta para as regras do `.slide`, cuja transição tem **atraso de 1.2s e duração 0**. Ela continua 100% opaca por baixo enquanto a nova aparece, e só some depois, quando já está coberta.

**Por que assim:** num fade cruzado comum, as duas telas ficam com ~50% de opacidade no meio da troca, e o fundo vazio aparece por trás. É esse o efeito de "piscar". Aqui sempre há uma tela totalmente opaca embaixo.

- `visibility: hidden` impede clicar ou focar elementos de telas escondidas.
- `will-change: opacity` avisa o navegador para preparar a animação na GPU.
- A duração fica em `--fade-duration`.

### 5.3 Erros em uma tela

Cada tela do carrossel fica dentro de um `ErrorBoundary` com `location` igual a `Dashboard › tela "<id>"`. O popup tem o seu, com `Dashboard › popup de venda`.
- Se uma tela quebrar (por exemplo, a API devolver erro e o `useSuspenseQuery` lançar a exceção), **só aquela tela** vira a tela "Ops, algo deu errado". As outras continuam no carrossel normalmente.
- O erro é registrado e aparece no admin, em "Logs de erro".
- A tela de erro do popup recebe a classe `.popupError` (`position: absolute; inset: 0; z-index: 3`) para aparecer por cima de tudo.

Como funciona o tratamento de erros: [ERROS_E_LOGS.md](ERROS_E_LOGS.md).

### 5.4 Fundo padrão dos slides

O `.slide` tem o fundo `slide-background.webp`. Toda tela do carrossel herda esse fundo sem declarar nada. A tela da meta tem o fundo próprio (`background.webp`) no `.screen` dela, que cobre o do slide.

**Por que no slide, e não em cada tela:**
- As telas de ranking não repetem CSS de fundo.
- Uma tela nova já nasce com o fundo certo.
- Garante que **toda tela é opaca** durante o fade, mesmo uma tela que esqueça de declarar fundo. Isso é o que mantém a transição sem piscar.

---

## 6. Camada de API

[src/features/dashboard/api/dashboardApi.js](src/features/dashboard/api/dashboardApi.js)

Todas as funções usam a instância do axios de `shared/apiClient.js`, que já cuida da URL base e dos cookies.

O backend responde sempre `{ success, data, message }`. As funções devolvem só o conteúdo de `data`, já no formato que o front usa.

### `isMockEnabled()` (de `shared/utils/isMockEnabled.js`)
Devolve `true` quando `VITE_USE_MOCKS` é a string `"true"`. Variáveis de ambiente sempre chegam como texto.
- É uma função, e não uma constante, porque é lida **a cada chamada**. Isso permite que os testes troquem o valor com `vi.stubEnv` entre um teste e outro.
- O nome não começa com `use` porque o lint confundiria a função com um hook do React.
- Fica em `shared/` porque o dashboard, o registro de erros e o admin usam a mesma chave.

### `getGoal()`
Busca `GET /analytics/goal` e devolve `{ goal, total, percent }`.

### `getScoreboard(period)`
Busca `GET /analytics/scoreboard?period=<period>`. Devolve a lista de times, cada um com `id` igual ao `teamId`.

### `getVendorRanking(period, department)`
Busca `GET /analytics/ranking?period=<period>&vendorDepartment=<department>`.
- O backend devolve `{ vendor: [...] }`. A função tira a lista de dentro de `vendor`.
- Cada vendedor ganha `id` igual ao `vendorId`.
- `department` é `"sales"` (vendas) ou `"farm"` (farmer). O nome do parâmetro na URL é `vendorDepartment`, que é o nome que o backend espera.

### `getSdrRanking(period)`
Busca `GET /analytics/sdr-ranking?period=<period>`. Cada pessoa ganha `id` igual ao `sdrId`.

### `toNewSale(event)`
Traduz um evento do SSE para o formato que o popup usa:
```js
{
  id,                                  // sale._id
  type: "sales" | "farm",              // sale.funnelType
  seller: { name, job, imageUrl },     // vendor.vendorName, vendor.job, vendor.imageUrl
  assists: [{ name, job, imageUrl }],  // sdrs[].name, sdrs[].job, sdrs[].imageUrl
}
```
- Devolve `null` quando o evento não traz `sale` e `vendor`, ou seja, quando não é uma venda nova (por exemplo, um cancelamento).
- **`assists` é uma lista**, porque uma venda pode ter 0, 1 ou mais passagens. Vem de `sdrs`, a lista que o backend manda no evento, na ordem da RD. Sem passagem, é `[]`.
- Se o evento vier no formato antigo, só com `sdr` (uma pessoa), vira uma lista com essa pessoa (`getEventAssists`). O backend ainda manda `sdr` junto com `sdrs` por compatibilidade, e pode tirar o `sdr` quando quiser: o front já usa a lista.
- `toPerson(pessoa)` pega só `name`, `job` e `imageUrl` de cada pessoa.
- `type` é `"farm"` quando `funnelType` é `"farm"` (renovação) e `"sales"` em qualquer outro caso.

### `SALE_VIDEO_URL` e `checkSaleVideo()`
`SALE_VIDEO_URL` é `/sale-video.mp4`, o vídeo que roda antes do outdoor do popup. Ele fica no `public/` do front.

`checkSaleVideo()` faz um `HEAD` nesse endereço e devolve a URL se o arquivo existir, ou `null` se não existir.
- Confere o `content-type`, e não só o status. Quando um arquivo não existe, o Vite (e a maioria dos servidores de SPA) devolve o `index.html` com status 200, então só o status não basta.
- Qualquer falha de rede também devolve `null`: sem vídeo, o popup mostra só a imagem.
- Usa `fetch`, e não o axios, porque o arquivo está no próprio front, e não na API.

**Por que traduzir aqui:** o popup não precisa saber que o backend chama o nome do vendedor de `vendorName` e o do SDR de `name`. Se o formato do evento mudar, só esta função muda.

### `subscribeToSalesEvents(onEvent)`
Abre um `EventSource` em `${VITE_API_URL}/sales/events`. A cada mensagem, converte o JSON, passa por `toNewSale` e chama `onEvent` com o resultado: a venda nova traduzida, ou `null` para qualquer outro evento. Devolve a função que fecha a conexão.
- Os eventos do mock passam pelo mesmo `toNewSale`, então o caminho é idêntico ao real.
- O `EventSource` é a API nativa do navegador para SSE e **reconecta sozinho** se a conexão cair. Numa TV ligada o dia todo, isso evita ter que recarregar a página.
- O padrão "inscrever e devolver a função de desinscrever" é o que o `useEffect` espera no cleanup.

**Por que todo item ganha `id`:** o `Podium` usa `item.id` como `key` da lista. Assim um único componente de pódio serve times, vendedores e SDRs. Com o mesmo `id` entre atualizações, o React reconhece cada item quando ele troca de posição.

---

## 7. Mocks

Os dados falsos (as mesmas rotas e o mesmo formato do backend, com vendas em 4 semanas) ficam em `shared/mocks` e servem o dashboard e o admin. Tudo sobre eles está em [MOCKS.md](MOCKS.md).

Com `VITE_USE_MOCKS=true`, as funções da API do dashboard chamam o servidor falso pelo `http.get` (`shared/httpClient.js`), e o SSE não envia nada: nenhuma venda nova aparece com o tempo e o popup não abre sozinho.

---

## 8. Hooks

### `dashboardKeys` e `REFETCH_INTERVAL`

[src/features/dashboard/hooks/dashboardKeys.js](src/features/dashboard/hooks/dashboardKeys.js)

| Chave | Valor | Uso |
|---|---|---|
| `goal` | `["goal"]` | Meta |
| `scoreboards` | `["scoreboard"]` | Prefixo de **todos** os placares, usado para invalidar |
| `scoreboard(period)` | `["scoreboard", period]` | Placar de um período |
| `rankings` | `["ranking"]` | Prefixo de **todos** os rankings de pessoas, usado para invalidar |
| `saleVideo` | `["sale-video"]` | Checagem do vídeo do popup |
| `vendorRanking(period, department)` | `["ranking", "vendor", period, department]` | Artilheiros |
| `sdrRanking(period)` | `["ranking", "sdr", period]` | Assistências |

`REFETCH_INTERVAL` é 60 segundos.

**Por que centralizar as chaves:** é o que o guia do projeto pede. Quem lê os dados e quem invalida usa a mesma chave, sem erro de digitação.

**Por que todo parâmetro entra na chave:** o React Query identifica o cache pela chave. Se `period` não estivesse nela, o placar semanal e o geral dividiriam o mesmo cache e as duas telas mostrariam os mesmos números.

**Por que existem prefixos:** o React Query invalida por prefixo. Invalidar `["ranking"]` atinge as 5 telas de pessoas de uma vez.

### `useGoal()`
[useGoal.js](src/features/dashboard/hooks/useGoal.js) busca a meta com `useSuspenseQuery` e devolve `{ goal }`.

### `useScoreboard(period)`
[useScoreboard.js](src/features/dashboard/hooks/useScoreboard.js) busca o placar do período, ordena pelo `total` (maior primeiro) e devolve `{ teams }`.

### `useVendorRanking(period, department)`
[useVendorRanking.js](src/features/dashboard/hooks/useVendorRanking.js) busca os artilheiros, ordena por `points` e devolve `{ vendors }`.

### `useSdrRanking(period)`
[useSdrRanking.js](src/features/dashboard/hooks/useSdrRanking.js) busca as assistências, ordena por `points` e devolve `{ sdrs }`.

### Decisões comuns aos hooks de dados

**`useSuspenseQuery` em vez de `useQuery`:**
- Na primeira carga, o componente "suspende" e o `<Suspense>` mais próximo mostra o "Carregando...". O componente sempre recebe `data` preenchido e não precisa tratar `isLoading`.
- Nas atualizações seguintes (SSE, refetch), ele **não suspende de novo**: continua mostrando os dados antigos até os novos chegarem. Por isso a tela não pisca quando atualiza.

**Ordenação no `select`:**
- O `select` transforma os dados antes de entregá-los ao componente. O cache guarda a resposta original.
- O front ordena por conta própria, sem depender da ordem do backend. O destaque azul sempre vai para quem está realmente em primeiro.
- `sortByTotal` e `sortByPoints` são criadas **fora** do hook. Uma função criada dentro do hook seria nova a cada render, e o React Query rodaria a ordenação de novo sem necessidade.

**`refetchInterval` de 60s:** garantia caso algum evento do SSE se perca ou o backend fique um tempo sem enviar eventos.

---

## 9. Atualização em tempo real (SSE) e popup de venda

### `useSalesEvents(onNewSale)`

[src/features/dashboard/hooks/useSalesEvents.js](src/features/dashboard/hooks/useSalesEvents.js)

Ao montar, chama `subscribeToSalesEvents`. A cada evento:
1. Invalida três grupos de queries:
   - `["scoreboard"]`: os dois placares de equipes;
   - `["ranking"]`: os quatro rankings de artilheiros e o de assistências;
   - `["goal"]`: a meta, porque o faturamento muda.
2. Se o evento for uma venda nova, chama `onNewSale(venda)`.

Ao desmontar, fecha a conexão.

**Por que os dados são atualizados em qualquer evento:** venda nova, cancelada, reativada ou corrigida, todas mudam os números. Já o popup só aparece para venda nova.

**Por que o callback fica num `ref`:** a conexão é aberta uma vez só. Se o `onNewSale` fosse dependência do effect, toda vez que o callback mudasse a conexão seria fechada e aberta de novo. O `ref` guarda sempre o callback mais recente, e a conexão aberta usa o `ref`.

**Por que fica no `DashboardPage`:** é **uma** conexão para as 8 telas e o popup. Se cada tela abrisse a sua, seriam várias conexões abertas com o servidor.

### `useSaleQueue()`

[src/features/dashboard/hooks/useSaleQueue.js](src/features/dashboard/hooks/useSaleQueue.js)

É a fila FIFO (o primeiro que entra é o primeiro que sai) das vendas do popup. Devolve:
- `currentItem`: a entrada que está na tela agora (`{ key, sale }`), ou `null` com a fila vazia;
- `enqueueSale(venda)`: coloca uma venda no **fim** da fila;
- `dequeueSale()`: tira a **primeira** venda da fila (`items.slice(1)`).

A fila não controla tempo: quem avisa que a venda terminou é o popup, porque só ele sabe quanto o vídeo durou.

**Por que cada entrada ganha uma `key` própria:**
- O popup usa a `key` para saber que chegou uma entrada nova e recomeçar pelo vídeo.
- Se a mesma venda chegasse duas vezes seguidas, as duas teriam o mesmo objeto. Com a `key`, a segunda é vista como outra entrada e também é mostrada.
- A `key` vem de um contador num `ref`, que não causa render ao mudar.

### `useSaleVideo()`

[src/features/dashboard/hooks/useSaleVideo.js](src/features/dashboard/hooks/useSaleVideo.js)

Chama `checkSaleVideo` uma vez e devolve `{ videoUrl }`: a URL do vídeo ou `null`.
- `staleTime: Infinity`: a checagem roda uma vez por carregamento da página. Se você colocar o vídeo depois, recarregue a TV.
- `retry: false`: se a checagem falhar, o popup segue sem vídeo em vez de ficar tentando.
- Usa `useQuery`, e não `useSuspenseQuery`: enquanto a checagem não termina, `videoUrl` é `null` e nada fica esperando.

### `DashboardPage` + popup
```js
const { currentItem, enqueueSale, dequeueSale } = useSaleQueue();
const { videoUrl } = useSaleVideo();
const paused = currentItem !== null;
useSalesEvents(enqueueSale);
...
<SalePopup item={currentItem} videoUrl={videoUrl} onFinish={dequeueSale} />
```
- O SSE coloca cada venda nova no fim da fila.
- O popup mostra a primeira da fila e chama `onFinish` quando termina. O `dequeueSale` tira essa venda, e a próxima aparece.
- **O carrossel pausa enquanto o popup está na tela.** O effect do timer depende de `paused`: quando o popup aparece, o `setInterval` é desligado; quando a fila esvazia, ele é criado de novo e a tela atual fica mais 15s antes de trocar. Assim nenhuma tela "passa escondida" atrás do popup.

### O que acontece quando chega uma venda
1. O backend chama `broadcast(...)` e o `EventSource` recebe a mensagem.
2. O `toNewSale` traduz o evento e o `onEvent` dispara os três `invalidateQueries`.
3. Como é venda nova, ela entra no fim da fila do `useSaleQueue`. Se a fila estava vazia, o popup aparece com fade na hora e o carrossel pausa.
4. O React Query marca as queries como desatualizadas. Como todas as telas estão montadas, ele **busca tudo de novo na hora**.
5. Enquanto busca, as telas continuam mostrando os dados antigos, sem "Carregando" e sem piscar.
6. As respostas chegam e o `select` ordena de novo.
7. Os pódios renderizam na nova ordem e o destaque vai para o novo 1º lugar. A barra da meta desliza até o novo valor (`transition: width 0.8s`).
8. O popup roda o vídeo (se existir) e depois mostra o outdoor por 10s. Então a venda sai da fila. Se houver outra, ela começa de novo pelo vídeo. Se não, o popup some com fade e o carrossel volta a rodar, já com os números novos.

### StrictMode em desenvolvimento
No `npm run dev`, o React monta, desmonta e monta de novo cada componente. No DevTools aparece uma conexão SSE que abre e fecha antes da definitiva. Isso é normal e não acontece no build de produção. O cleanup do `useEffect` garante que nenhuma conexão fica sobrando.

---

## 10. Componentes

Componentes só desenham o que recebem. Nenhum deles busca dados.

### `SalePopup({ item, videoUrl, onFinish })`

[components/SalePopup/SalePopup.jsx](src/features/dashboard/components/SalePopup/SalePopup.jsx)

Popup em tela cheia da venda nova. Com `item` preenchido ele aparece; com `null`, some.

Cada venda passa por **duas etapas**:

| Etapa | O que aparece | Quando termina |
|---|---|---|
| 1. Vídeo | `SALE_VIDEO_URL` em tela cheia | Quando o vídeo acaba (`onEnded`) ou falha (`onError`) |
| 2. Outdoor | Fundo do outdoor com vendedor, "+1 VENDA" ou "+1 RENOVAÇÃO" e as assistências | Depois de `SALE_BILLBOARD_DURATION` (10s), chama `onFinish` |

Sem vídeo (`videoUrl` nulo), a venda já começa no outdoor.

**`SalePopup`:**
- **`displayedItem`** guarda a última entrada mostrada. Quando `item` vira `null`, o popup começa o fade de saída, mas continua desenhando a última venda até sumir. Sem isso, o conteúdo desapareceria de uma vez e só o fundo faria o fade.
  - A atualização é feita durante o render (`if (item && item !== displayedItem) setDisplayedItem(item)`), o padrão do React para guardar o valor anterior de uma prop sem um render extra.
- Renderiza `SaleSequence` com `key={displayedItem.key}`. Cada entrada da fila monta uma sequência nova, que **começa de novo pelo vídeo**.

**`SaleSequence({ sale, videoUrl, active, onFinish })`:** controla as etapas.
- `stage` começa em `"video"` se houver vídeo, ou em `"billboard"` se não houver.
- O `<video>` usa `autoPlay`, `muted` e `playsInline`. Os navegadores só deixam um vídeo tocar sozinho, sem clique, se ele estiver **mudo**. Para tocar com som numa TV, o navegador precisa ser aberto com a política de autoplay liberada (no Chrome: `--autoplay-policy=no-user-gesture-required`) e o `muted` sai do código.
- Um effect agenda os 10s do outdoor só quando `stage` é `"billboard"` **e** `active` é verdadeiro. Durante o fade de saída (`active` falso), o timer não roda, e o `onFinish` não é chamado duas vezes.
- `onFinish` fica num `ref`, para o timer não recomeçar se o pai renderizar de novo.

**`SaleBillboard({ sale })`:** o conteúdo do outdoor.
- `HEADLINES` faz `sales` virar "+1 Venda" e `farm` virar "+1 Renovação".
- O bloco das **assistências** (`AssistList`) só é renderizado quando `sale.assists` tem alguém, ou seja, quando a venda teve passagem.
- Sem `imageUrl`, a foto do vendedor não aparece e o avatar da pessoa da passagem vira um círculo vazio com a borda amarela.

**`AssistList({ assists })`:** as pessoas da passagem.
- **Uma pessoa:** igual ao Figma, com o avatar e, ao lado, "Assistência" em cima do nome e cargo.
- **Duas ou mais:** "Assistências" (no plural) uma vez em cima, e as pessoas lado a lado, cada uma com avatar, nome e cargo. Se não couberem na largura do painel, quebram para a linha de baixo.
- **Três ou mais** (`COMPACT_FROM`): a lista ganha `.assistListCompact`, com avatar de 60px e nome de 28px (em vez de 88px e 40px), para todo mundo caber no painel do outdoor.
- A `key` de cada pessoa usa o nome e a posição, porque o evento não manda id das pessoas.
- O cargo (`job`) aparece entre parênteses ao lado do nome.

`aria-hidden` marca o popup escondido para leitores de tela. Os testes usam esse atributo.

**CSS:**
- `.popup`: `position: absolute; inset: 0` cobre o dashboard inteiro, com `z-index: 2`, acima das telas do carrossel (a ativa usa `z-index: 1`). Não é um modal centralizado com fundo escurecido: ocupa a tela toda, como no Figma.
- `.popup` → `.visible`: mesmo truque de fade do carrossel, com `opacity` + `visibility` e atraso no `visibility` ao sair. Dura 0.6s (`--fade-duration`).
- `.video`: o vídeo em tela cheia com `object-fit: cover`.
- `.billboardStage`: a etapa do outdoor, com o fundo `sale-popup-background.webp`. Entra com a animação `stageEnter` (fade de 0.6s), tanto depois do vídeo quanto na troca entre duas vendas sem vídeo.
- `.billboard`: posicionado em porcentagem sobre o painel do outdoor da imagem de fundo. O painel vai de x=322 a 1597 e de y=155 a 700 numa imagem de 1920×1080, o que dá `left: 16.77%`, `top: 14.35%`, `width: 66.41%` e `height: 50.46%`. Em qualquer tela 16:9 o conteúdo fica dentro do painel. Em telas com outra proporção, o `cover` corta as bordas da imagem e o conteúdo pode sair um pouco do lugar.
- `.headline`: "+1 VENDA" ou "+1 RENOVAÇÃO" em amarelo, 92px.
- `.assists`: o bloco das assistências, em coluna (rótulo no plural em cima, lista embaixo).
- `.assistList`: as pessoas lado a lado, com quebra de linha. `.assist`: uma pessoa (avatar + nome).
- `.avatar`: círculo com borda amarela, `object-fit: cover`.
- `.photo`: foto do vendedor alinhada à base do painel, à direita, com `object-fit: contain`.

As medidas do conteúdo vieram da proporção do print (703px de largura, ~2,73× para 1920px): nome 48px, cargo 22px, "+1 VENDA" 92px, avatar 88px, nome da assistência 40px e recuo do texto 150px.

### `GoalProgress({ total, goal, percent })`

[components/GoalProgress/GoalProgress.jsx](src/features/dashboard/components/GoalProgress/GoalProgress.jsx)

Desenha a barra de progresso com o total à esquerda e a meta à direita.
- `fillWidth = Math.min(Math.max(percent, 0), 100)`: a barra fica entre 0% e 100%. Quando a meta é batida, o backend pode mandar mais de 100, e a barra para no limite.
- A largura vai como estilo inline, porque é um valor dinâmico.
- `role="progressbar"` e os `aria-value*` descrevem a barra para acessibilidade. Os testes também usam esses atributos.

**CSS:**
- `.track`: trilho cinza arredondado.
- `.fill`: azul neon com degradê, borda clara, brilho externo (`box-shadow`) e brilho interno (`inset`).
- `transition: width 0.8s`: a barra desliza quando o valor muda.
- `min-width`: com 0%, ainda aparece uma "bolinha".

### `RankingLayout({ title, subtitle, accent, loadingText, children })`

[components/RankingLayout/RankingLayout.jsx](src/features/dashboard/components/RankingLayout/RankingLayout.jsx)

É a moldura comum das telas de ranking: título, subtítulo opcional, logo no canto superior direito e o `<Suspense>` em volta do conteúdo.
- `title` aceita texto ou JSX. A tela de assistências usa isso para quebrar o título em duas linhas com `<br />`, como no Figma.
- `subtitle` é opcional. Sem ele, a linha não é renderizada.
- `accent` deixa o subtítulo amarelo e em negrito.
- `loadingText` é o texto mostrado enquanto os dados carregam.

**Por que existe:** as 7 telas de ranking têm o mesmo cabeçalho, o mesmo logo e o mesmo carregamento. Num lugar só, uma mudança de layout vale para todas.

### `Podium({ items, emptyText, renderItem })`

[components/Podium/Podium.jsx](src/features/dashboard/components/Podium/Podium.jsx)

Desenha a lista dos colocados, da esquerda para a direita.
- Lista vazia: mostra `emptyText`.
- Senão: um `<ol>` com um `<li>` por item, usando `item.id` como `key`.
- `renderItem(item, index)` decide qual card desenhar. O pódio não sabe se é time ou pessoa.

**Por que `<ol>`:** é uma lista **ordenada**, porque a ordem significa posição.

**Por que `.item` tem `display: flex`:** o card dentro do `<li>` estica até a altura do maior card. Os três ficam sempre do mesmo tamanho, mesmo com nomes de tamanhos diferentes.

### `TeamCard({ team, highlighted })`

[components/TeamCard/TeamCard.jsx](src/features/dashboard/components/TeamCard/TeamCard.jsx)

Card de um time: camiseta, total de pontos e a tabela de detalhes.
- `formatPoints(points)` escreve "1 ponto" ou "N pontos".
- `DETAIL_ROWS` lista as linhas da tabela: Vendas (`sales`), Farmer (`farm`) e Passagens (`passage`). No backend, `sales` junta vendas B2B e GOV, `farm` junta farmer B2B e GOV, e `passage` junta SDR, Suporte e CS. Para mudar as linhas, basta mexer nesse array.
- `team[row.field] ?? 0`: campo ausente vira 0 e o card não quebra.
- A camiseta só aparece se `teamShirt` existir. O `alt` é o nome do time.
- `<dl>/<dt>/<dd>` é a forma semântica de uma lista de "rótulo: valor".

**CSS:**
- `--card-padding` (50px) e `--shirt-height` (130px) ficam em variáveis, porque são usados em mais de uma regra.
- `.shirt` tem altura fixa (`--shirt-height` + 2 × padding). Os cards ficam alinhados mesmo se algum time não tiver imagem.
- `.highlighted` muda a borda e adiciona o brilho. `.highlighted .body` aplica o degradê azul só no corpo do card.
- `.detailRow` usa `align-items: baseline`. Com 18px de um lado e 21px do outro, alinhar pelo centro deixaria os textos desnivelados.

### `PlayerCard({ player, position, highlighted })`

[components/PlayerCard/PlayerCard.jsx](src/features/dashboard/components/PlayerCard/PlayerCard.jsx)

Card de uma pessoa: medalha com a posição, nome, pontos e "PONTOS" (ou "PONTO", com 1).
- Serve aos artilheiros e às assistências, porque os dois têm `name` e `points`.
- `position` vem do pódio (`index + 1`), e não do backend. Ela sempre bate com a ordem exibida.
- O nome é um `<h2>`, o título do card.

**CSS:**
- `.position`: círculo amarelo com o texto escuro.
- `.name`: `overflow-wrap: anywhere` quebra nomes muito longos em vez de estourar o card.
- `.highlighted`: no card de pessoa, o degradê azul vai no card inteiro, como no Figma.
- Pontos (116px/800) e "PONTOS" (48px/700) usam as mesmas medidas do card de equipe.

---

## 11. Telas

### `GoalScreen()`

[screens/GoalScreen/GoalScreen.jsx](src/features/dashboard/screens/GoalScreen/GoalScreen.jsx)

Mostra o título "META BLACK", a barra de progresso e o logo.
- `GoalBoard()` é um componente interno que chama `useGoal()` e passa os números para o `GoalProgress`.

**Por que o `GoalBoard` é separado:** o `useSuspenseQuery` suspende o componente que o chamou, e o `<Suspense>` precisa estar **acima** dele. Se o hook ficasse no `GoalScreen`, a tela inteira, título incluído, sumiria durante o carregamento. Com o `GoalBoard`, só a área da barra mostra "Carregando...".

### `TeamRankingScreen({ period })`

[screens/TeamRankingScreen/TeamRankingScreen.jsx](src/features/dashboard/screens/TeamRankingScreen/TeamRankingScreen.jsx)

Mostra "RANKING DE EQUIPES" com o pódio de times.
- `PERIOD_LABELS`: `week` vira "Semanal" e `all` vira "Geral acumulado".
- `accent` só fica ligado no período `all` (subtítulo amarelo), como no Figma.
- `TeamPodium({ period })` busca com `useScoreboard` e desenha um `TeamCard` por time. O 1º recebe `highlighted`.

### `ScorerRankingScreen({ period, department })`

[screens/ScorerRankingScreen/ScorerRankingScreen.jsx](src/features/dashboard/screens/ScorerRankingScreen/ScorerRankingScreen.jsx)

Mostra "RANKING DE ARTILHEIROS" com o pódio de vendedores.
- O subtítulo junta `DEPARTMENT_LABELS` (`sales` → "Vendas", `farm` → "Farmer") e `PERIOD_LABELS` (`week` → "Semanal", `all` → "Geral"). Por exemplo: "Farmer Semanal".
- O subtítulo é sempre amarelo (`accent`), como no Figma.
- `ScorerPodium({ period, department })` busca com `useVendorRanking` e desenha um `PlayerCard` por vendedor.

**Por que uma tela com props, e não quatro telas:** as quatro variações só diferem no subtítulo e nos parâmetros da busca. Com uma tela, uma mudança visual vale para as quatro de uma vez.

### `AssistRankingScreen({ period })`

[screens/AssistRankingScreen/AssistRankingScreen.jsx](src/features/dashboard/screens/AssistRankingScreen/AssistRankingScreen.jsx)

Mostra "RANKING DE ASSISTÊNCIAS", em duas linhas e sem subtítulo, com o pódio de passagens.
- `AssistPodium({ period })` busca com `useSdrRanking` e desenha um `PlayerCard` por pessoa.
- No carrossel ela usa `period: "all"`, a campanha inteira, porque o Figma não indica período. Para a semana, troque para `"week"` no `SCREENS`.

---

## 12. Utilitários

### `formatCurrency(value)`

[src/shared/utils/formatCurrency.js](src/shared/utils/formatCurrency.js)

Formata um número como real brasileiro: `1500299.2` vira `R$ 1.500.299,20`.
- Usa `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- O formatador é criado uma vez, fora da função, e reaproveitado em todas as chamadas.
- `value ?? 0`: `undefined` ou `null` viram R$ 0,00.

### `sortDescBy(field)`

[src/features/dashboard/utils/sortDescBy.js](src/features/dashboard/utils/sortDescBy.js)

Recebe o nome de um campo e devolve uma função que ordena uma lista por esse campo, do maior para o menor.
```js
const sortByPoints = sortDescBy("points");
sortByPoints([{ points: 3 }, { points: 9 }]);
```
- `[...items]` copia a lista antes de ordenar, porque o `.sort()` altera o array original e alterar o cache do React Query causa bugs difíceis de achar.
- `b[field] - a[field]` coloca o maior primeiro.

**Por que devolve uma função:** a função pronta (`sortByPoints`) é criada uma vez, fora do hook, e passada direto para o `select`. É o que evita ordenar de novo a cada render.

---

## 13. Estilos, medidas e imagens

### Padrão dos CSS Modules
- Cada componente tem o seu `.module.css` na mesma pasta, com classes em camelCase.
- As cores ficam em variáveis `--color-*` no topo da classe raiz, no mesmo padrão do AdminPanel e do Login.

### Medidas do Figma com `clamp()`
As medidas do Figma foram tiradas numa tela de 1920px de largura (TV Full HD). Cada uma virou:
```css
font-size: clamp(mínimo, (px ÷ 19.2)vw, px-do-Figma);
```
- `px ÷ 19.2` converte para `vw`: 1vw é 1% da largura, e 1% de 1920 é 19.2px. Numa tela de 1920px, o valor fica **exatamente** o do Figma.
- Em telas menores, como um notebook de 1366px, tudo encolhe na mesma proporção.
- O **máximo** é o valor do Figma: numa TV 4K a tela fica com o tamanho do design, em vez de crescer além dele.
- O **mínimo** evita que algo fique ilegível numa janela muito pequena.

| Tela | Elemento | Figma |
|---|---|---|
| Meta | Título | 85px |
| Meta | Espaço título → barra | 178px |
| Meta | Altura da barra | 100px |
| Meta | Espaço valores → logo | 121px |
| Meta | Logo | 265px |
| Rankings | Logo do canto | 153px |
| Rankings | Largura máxima do card | 450px |
| Rankings | Espaço entre cards | 28px |
| Rankings | Número de pontos | 116px / 800 |
| Rankings | "PONTOS" | 48px / 700 |
| Rankings | Padding do card e da área do logo do time | 50px |
| Equipes | Texto da esquerda da tabela | 18px / 400 |
| Equipes | Texto da direita da tabela | 21px / 700 |

As medidas que o Figma não informou (nome, medalha e subtítulo, por exemplo) foram tiradas da proporção do print.

### Imagens (`public/`)

| Arquivo | Onde é usado |
|---|---|
| `background.webp` | Fundo da Meta e do Login |
| `slide-background.webp` | Fundo padrão de todas as outras telas do carrossel |
| `sale-popup-background.webp` | Fundo do outdoor no popup de venda (de 2,2 MB em JPG para 256 KB) |
| `sale-video.mp4` | Vídeo opcional que roda antes do outdoor no popup. Ainda não existe |
| `orca-black-logo.png` | Logo embaixo da barra da meta e no canto das telas de ranking. O tamanho original é 265px, e o `clamp` nunca passa disso para não borrar |

**Conversão para WebP:** os fundos vieram em PNG com cerca de 2 MB cada e viraram WebP com cerca de 45 KB, sem diferença visível. Os PNGs tinham partes semitransparentes. Antes de converter, essas partes foram combinadas com `#040a18`, a cor que fica atrás da imagem. Assim o resultado é idêntico ao que aparecia na tela.

---

## 14. Testes

### Ferramentas

| Pacote | Para que serve |
|---|---|
| `vitest` | Roda os testes. Reaproveita a configuração do Vite (plugin React, CSS Modules) |
| `jsdom` | Simula o navegador (DOM) dentro do Node |
| `@testing-library/react` e `@testing-library/dom` | Renderizam componentes e buscam elementos como um usuário faria: por texto, papel ou título |
| `@testing-library/jest-dom` | Asserts de DOM como `toBeInTheDocument`, `toHaveStyle` e `toHaveAttribute` |

### Configuração
- **[vite.config.js](vite.config.js)**, bloco `test`: `environment: 'jsdom'` e `setupFiles: './src/test/setup.js'`.
- **[src/test/setup.js](src/test/setup.js)**: carrega os asserts do jest-dom e roda `cleanup()` depois de cada teste, para limpar o DOM entre eles.
- **[src/test/renderWithQuery.jsx](src/test/renderWithQuery.jsx)**, `renderWithQuery(ui)`: renderiza o componente dentro de `QueryClientProvider` + `Suspense`. Cada teste ganha um `QueryClient` **novo**, para não haver cache compartilhado, com `retry: false`, para que um erro da API apareça na hora em vez de ser tentado de novo.

### Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Roda todos os testes uma vez |
| `npm run test:watch` | Roda de novo a cada arquivo salvo |

### O que cada arquivo testa

| Arquivo | Garante |
|---|---|
| `formatCurrency.test.js` | Formato `R$ 1.500.299,20`; `undefined` vira R$ 0,00 |
| `sortDescBy.test.js` | Ordena do maior para o menor; não altera o array original |
| `dashboardApi.test.js` | Tira o envelope; envia os parâmetros certos para cada rota; tira a lista de dentro de `vendor`; acrescenta o `id`; com mocks ligados não chama o backend; `toNewSale` traduz a venda com a lista de passagens, aceita o formato antigo só com `sdr`, marca farmer como renovação, devolve lista vazia sem passagem e devolve `null` para outros eventos; `checkSaleVideo` devolve a URL só quando o arquivo é um vídeo e `null` quando não existe ou a rede falha; o SSE monta a URL certa, repassa o evento traduzido e fecha a conexão |
| `useSalesEvents.test.jsx` | Abre uma conexão só; cada evento invalida placares, rankings e meta; repassa só venda nova ao callback; usa o callback mais recente sem reabrir a conexão; fecha a conexão ao desmontar |
| `useSaleQueue.test.js` | Começa vazia; a primeira que entra é a da tela; sai na ordem de chegada (FIFO); venda nova não muda a da tela; cada entrada tem `key` própria, mesmo com a mesma venda |
| `SalePopup.test.jsx` | Escondido sem venda; sem vídeo vai direto ao outdoor; "+1 Renovação" para farmer; assistência só com passagem; duas passagens mostram "Assistências" e as duas pessoas; três ou mais ficam em tamanho menor; `onFinish` só depois de 10s de outdoor; com vídeo, o outdoor só aparece quando o vídeo acaba; vídeo com erro pula para o outdoor; cada venda da fila recomeça pelo vídeo; ao sair mantém a última venda no fade sem chamar `onFinish` de novo |
| `GoalProgress.test.jsx` | Valores em R$; largura da barra igual ao percent; limite em 100% |
| `TeamCard.test.jsx` | Total; as 3 linhas com singular e plural; campo ausente vira 0; camiseta com `alt`; time sem camiseta não quebra |
| `PlayerCard.test.jsx` | Posição, nome e pontos; "Ponto" no singular |
| `TeamRankingScreen.test.jsx` | Chama a API com o período; ordena mesmo com a API mandando fora de ordem; subtítulo de cada período; lista vazia |
| `ScorerRankingScreen.test.jsx` | Chama a API com período e tipo; ordena e numera as posições; subtítulo das 4 combinações; lista vazia |
| `AssistRankingScreen.test.jsx` | Chama a API com o período; ordena; título sem subtítulo; lista vazia |
| `DashboardPage.test.jsx` | Monta as 8 telas e começa na meta; não troca antes de 15s; passa por todas na ordem e volta ao início, com só uma visível por vez; para o timer ao sair; venda nova abre o popup e ele some em 10s; vendas juntas aparecem uma de cada vez, na ordem; o carrossel pausa durante o popup e retoma depois; erro numa tela mostra a tela de erro só nela e registra o log |

### Técnicas usadas
- **`vi.mock(caminho, fábrica)`** troca um módulo inteiro por uma versão falsa. No teste do `DashboardPage`, as telas viram um `<p>` simples, porque ali só importa a troca entre elas.
- **`vi.stubEnv` e `vi.stubGlobal`** trocam variáveis de ambiente e objetos globais (como o `EventSource`) só durante o teste.
- **Fake timers** (`vi.useFakeTimers` + `vi.advanceTimersByTime`): em vez de esperar 15 segundos de verdade, o teste "adianta o relógio". O `act()` em volta garante que o React processou a mudança de estado antes do `expect`.
- **`findBy*` × `getBy*`:** `findBy` espera o elemento aparecer e é usado depois do Suspense. `getBy` exige que o elemento já esteja na tela.
- **`it.each`** roda o mesmo teste com várias entradas, como as 4 combinações de subtítulo dos artilheiros.

**Os testes pegam erro de verdade:** isso foi conferido quebrando o código de propósito. Com o intervalo trocado para 10s, os testes do carrossel falharam. Sem a ordenação do `useVendorRanking`, o teste dos artilheiros falhou. Com a fila tirando o último item em vez do primeiro, 3 testes da fila falharam. Sem a pausa, o teste do carrossel durante o popup falhou. Com o popup ignorando o vídeo, 3 testes do `SalePopup` falharam.

---

## 15. Como adicionar uma tela nova

1. Se a tela precisa de dados novos:
   - crie a função em `api/dashboardApi.js`, devolvendo a lista com `id` em cada item;
   - responda a rota nova em `shared/mocks/mockApi.js` (ver [MOCKS.md](MOCKS.md));
   - crie a chave em `hooks/dashboardKeys.js`, de preferência sob um prefixo que o `useSalesEvents` já invalida;
   - crie o hook em `hooks/`.
2. Crie a tela em `screens/NomeDaTela/NomeDaTela.jsx`. Se for um ranking, use `RankingLayout` + `Podium` + o card adequado.
3. Acrescente a tela no `SCREENS` do `DashboardPage`, na posição desejada.
4. Acrescente o `id` no `SLIDE_IDS` do `DashboardPage.test.jsx` e o `vi.mock` da tela nova.
5. Escreva os testes da tela e rode `npm test`.

O fundo padrão, o fade, o SSE e o refetch funcionam sem nenhuma configuração extra.

---

## 16. Pendências

| Item | Onde | Situação |
|---|---|---|
| Vídeo do popup | `public/sale-video.mp4` | Coloque o vídeo com esse nome e recarregue a TV. Sem o arquivo, o popup mostra só o outdoor |
| Som do vídeo | `SalePopup` | O vídeo toca mudo, porque é a única forma de tocar sozinho no navegador. Para ter som, a TV precisa abrir o navegador com o autoplay liberado |
| Fonte do Figma | `font-family: system-ui` nas telas | Trocar quando a fonte for definida |
| Animação de troca de posição | `Podium` | Hoje os cards trocam de lugar na hora, sem deslizar |
