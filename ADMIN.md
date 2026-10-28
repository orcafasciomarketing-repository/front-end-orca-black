# Painel admin

Como funciona o painel admin (`/admin`): o layout com menu lateral, as duas páginas (Dashboard e Erros), os widgets, os filtros por semana e por vendedor e a exportação.

O código não tem comentários de propósito. Toda explicação fica neste documento. Os widgets de logs de erro e de teste estão em [ERROS_E_LOGS.md](ERROS_E_LOGS.md).

---

## 1. Visão geral

### Layout e navegação

```
┌──────────────┬─────────────────────────────────────────────────────┐
│  ORÇA BLACK  │ Dashboard                 [Semana ▾] [Vendedor ▾] [⤓ Exportar] │
│              │ Vendas e rankings da Black Friday                   │
│ ▣ Dashboard  │ ┌──────────────────────────┐ ┌────────────────────┐ │
│ ⚠ Erros      │ │ Vendas cadastradas       │ │ Rank dos vendedores│ │
│              │ │ (2 colunas × 2 linhas)   │ │ [Vendas|Renovação] │ │
│ (menu escuro)│ │                          │ ├────────────────────┤ │
│              │ │                          │ │ Rank das passagens │ │
│              │ └──────────────────────────┘ └────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────┘
```

| Rota | Página | Conteúdo |
|---|---|---|
| `/admin` | `AdminPanel` (Dashboard) | Filtros, Vendas cadastradas, Rank dos vendedores e Rank das passagens |
| `/admin/erros` | `ErrorsPage` (Erros) | Logs de erro e Logs de teste |

As duas páginas ficam dentro do `AdminLayout`, que desenha o menu lateral. Trocar de aba é navegação interna do React Router: a página não recarrega, o menu continua no lugar e só o conteúdo da direita muda (SPA). Os endereços `/admin` e `/admin/erros` também podem ser abertos direto ou salvos nos favoritos.

### Filtros

- A barra de filtros do Dashboard tem dois seletores: **semana** e **vendedor**. Os dois se combinam e valem ao mesmo tempo para a lista de vendas **e** para a exportação.
- **Semana:** "Todas as semanas" ou uma semana específica. A lista tem **todas as semanas do mês, da semana do dia 1º até a atual**, mesmo as que ainda não têm venda (e volta mais, se houver venda antes do mês). A atual e a passada aparecem com nome ("Semana atual", "Semana passada").
- **Vendedor:** "Todos" ou um vendedor.
- Exemplos:

| Semana | Vendedor | Lista e exportação |
|---|---|---|
| Todas | Todos | Todas as vendas |
| Todas | Carla | Todas as vendas da Carla |
| Semana passada | Todos | As vendas de todo mundo na semana passada |
| 12/10 a 18/10 | Carla | Só as vendas da Carla naquela semana |

- O arquivo exportado é um **CSV** que o Excel abre direto. O nome mostra os filtros: `vendas-todos-2026-10-22.csv`, `vendas-carla-2026-10-22.csv`, `vendas-carla-semana-2026-10-12-2026-10-22.csv`.
- O antigo botão "Dados da última semana" virou o seletor de semana, que inclui a semana passada e qualquer outra.

- Os filtros valem **só para a lista de vendas e para a exportação**. Os rankings mostram a campanha inteira, porque o backend só filtra ranking por "semana atual" ou "tudo", e não por semana específica nem por vendedor.

```
AdminPanel
  ├── selectedVendorId (useState, "" = Todos)
  ├── selectedWeek     (useState, "" = Todas as semanas, ou "2026-10-12" = segunda da semana)
  ├── SalesFilters(selectedVendorId, onVendorChange, selectedWeek, onWeekChange)
  │     ├── useVendors      → GET /vendor/list                       (opções de vendedor)
  │     ├── useWeekOptions  → GET /sales/admin → listWeeks           (opções de semana)
  │     └── useExportSales  → fetchQuery(vendedor) → filterSalesByWeek(semana) → salesToCsv → downloadFile
  ├── SaleWidget(vendorId, weekKey)
  │     └── useAdminSales   → GET /sales/admin ou /sales/get/:vendorId → filterSalesByWeek(semana)
  ├── RankWidget            → abas Vendas/Renovação → GET /analytics/ranking?vendorDepartment=...
  └── SdrRankWidget         → GET /analytics/sdr-ranking
```

---

## 2. Onde fica o filtro

[src/features/admin/pages/AdminPanel.jsx](src/features/admin/pages/AdminPanel.jsx)

`AdminPanel` guarda os dois filtros com `useState("")`:
- `selectedVendorId`: `""` significa "Todos"; senão, o `_id` do vendedor.
- `selectedWeek`: `""` significa "Todas as semanas"; senão, a **chave da semana**, que é a data da segunda-feira (`"2026-10-12"`).

O `SalesFilters` recebe os dois valores e as funções para trocar (`onVendorChange`, `onWeekChange`). O `SaleWidget` recebe os dois como `vendorId` e `weekKey`.

**Por que o estado fica no `AdminPanel`:** os filtros são usados por dois componentes irmãos, a barra de filtros (seletores e exportação) e a lista. O estado fica no pai dos dois, e cada um recebe o que precisa por props. Assim a lista e a exportação nunca ficam com filtros diferentes.

**Por que o vendedor é filtrado no backend e a semana no front:**
- O backend já tem rota por vendedor (`/sales/get/:vendorId`), então o vendedor vai na requisição.
- As rotas de vendas do admin não aceitam datas, então a semana é aplicada no front, sobre as vendas que chegaram. Não precisou mexer no backend, e trocar de semana é instantâneo, porque não faz requisição nova.
- Se um dia as vendas ficarem muitas (dezenas de milhares), vale criar `startDate`/`endDate` no backend e mandar a semana na requisição. O resto do front não muda.

---

## 3. API

[src/features/admin/api/slidesApi.js](src/features/admin/api/slidesApi.js)

### `getAdminSales(vendorId)`
- Sem `vendorId` (ou com `""`): `GET /sales/admin`, todas as vendas.
- Com `vendorId`: `GET /sales/get/:vendorId`, só as vendas daquele vendedor.

As duas rotas são privadas (o token vai pelo `apiClient`) e respondem `{ data: [vendas], total }`, com `vendorId` e `sdrIds` já populados (`sdrIds` é a lista de pessoas da passagem: vazia sem passagem, com uma ou mais pessoas com passagem). A função devolve `{ sales, total }`, com as vendas da **mais nova para a mais antiga** pela `realizedAt`.

**Por que ordenar no front:** o `/sales/admin` já vem ordenado, mas o `/sales/get/:vendorId` não. Ordenando aqui, a lista e o CSV ficam na mesma ordem com ou sem filtro.

### `getVendors()`
`GET /vendor/list` (pública). Devolve a lista de vendedores com `_id` e `vendorName`.

### `getRankVendors(department)`
`GET /analytics/ranking?vendorDepartment=<department>`, com `department` igual a `"sales"` ou `"farm"`. Devolve a lista de dentro de `data.vendor` (top 3). Usada pelo `RankWidget`.

### `getRankSdrs()`
`GET /analytics/sdr-ranking`. Devolve a lista de passagens (top 3), com `sdrId`, `name`, `job` e `points`. Usada pelo `SdrRankWidget`.

---

## 4. Hooks

### `adminKeys`, `adminSalesQuery(vendorId)` e `vendorsQuery`

[src/features/admin/hooks/adminQueries.js](src/features/admin/hooks/adminQueries.js)

| Nome | Valor |
|---|---|
| `adminKeys.sales(vendorId)` | `["admin-sales", vendorId]`, ou `["admin-sales", "all"]` sem filtro |
| `adminKeys.vendors` | `["vendors"]` |
| `adminSalesQuery(vendorId)` | `{ queryKey, queryFn }` das vendas daquele filtro |
| `vendorsQuery` | `{ queryKey, queryFn }` dos vendedores |

**Por que existem as "query options":** a lista (`useSuspenseQuery`) e a exportação (`queryClient.fetchQuery`) usam **a mesma configuração**, com a mesma chave e a mesma função. Isso garante que a exportação busca exatamente os mesmos dados que a lista mostra, e que as duas compartilham o cache.

**Por que o vendedor está na chave:** cada filtro tem o seu cache. Voltar para um vendedor já visto mostra os dados na hora, enquanto o React Query atualiza por trás.

### `useAdminSales(vendorId, weekKey)`
[useAdminSales.js](src/features/admin/hooks/useAdminSales.js) roda `useSuspenseQuery(adminSalesQuery(vendorId))` com um `select` que aplica `filterSalesByWeek(sales, weekKey)`. Devolve `{ sales, total }`, em que `total` é a quantidade **depois** do filtro de semana, a que aparece no contador.
- **Trocar de vendedor** muda a chave: o widget suspende e mostra "Carregando dados..." até a resposta chegar (ou na hora, se aquele vendedor já está no cache).
- **Trocar de semana** não muda a chave: o `select` roda de novo sobre os dados que já estão no cache, sem requisição e sem "Carregando".
- O `select` é criado com `useCallback` dependendo de `weekKey`, para só refazer o filtro quando a semana muda.

### `useWeekOptions()`
[useWeekOptions.js](src/features/admin/hooks/useWeekOptions.js) devolve `{ weeks }`, as opções do seletor de semana: `[{ key, label }]`, da semana atual até a semana do dia 1º do mês (ou até a venda mais antiga, se for antes).
- Usa **todas** as vendas (`adminSalesQuery()`, sem vendedor), para as opções não mudarem quando o vendedor muda. Essa busca é a mesma da lista com "Todos", então compartilha o cache.
- Usa `useQuery`, e não `useSuspenseQuery`: enquanto as vendas carregam, já mostra as semanas do mês (`listWeeks([])`) e o cabeçalho não fica esperando.

### `useVendors()` e `getVendorLabel(vendor)`
[useVendors.js](src/features/admin/hooks/useVendors.js) busca os vendedores e os ordena por nome (`localeCompare` em pt-BR, para acentos ficarem no lugar certo). Devolve `{ vendors, vendorsFailed }`. `vendors` é `[]` enquanto carrega.
- `getVendorLabel(vendor)` devolve o `vendorName`, ou "Vendedor sem nome" quando o cadastro não tem nome. É usada na ordenação e no texto da opção.
- **Por que existe:** um vendedor sem `vendorName` fazia a ordenação quebrar (`undefined.localeCompare`). A query falhava e o seletor ficava só com "Todos", sem nenhum aviso. Agora o cadastro sem nome aparece como "Vendedor sem nome" e os outros continuam na lista.
- Se a busca falhar, `vendorsFailed` fica verdadeiro, o seletor mostra "Não foi possível carregar os vendedores" e o erro é registrado em `Admin › lista de vendedores` (aparece em "Logs de erro").
- Usa `useQuery`, e não `useSuspenseQuery`: o cabeçalho aparece na hora, só com "Todos", e os nomes entram quando a lista chega. Assim o cabeçalho inteiro não fica esperando.

### `useExportSales()`
[useExportSales.js](src/features/admin/hooks/useExportSales.js)

Devolve `{ exportSales, isExporting, exportFailed }`.

`exportSales({ vendor, weekKey })` recebe o vendedor selecionado (ou `null` para "Todos") e a semana (ou `""`) e:
1. busca as vendas com `queryClient.fetchQuery(adminSalesQuery(vendor?._id))`, a mesma busca da lista;
2. aplica `filterSalesByWeek(sales, weekKey)`, o mesmo filtro da lista;
3. monta o CSV com `salesToCsv`;
4. baixa o arquivo com `downloadFile`, com o nome de `buildExportFileName({ vendor, weekKey })`.

A lista e a exportação usam **as mesmas duas funções** (`adminSalesQuery` e `filterSalesByWeek`), então o arquivo sempre tem exatamente o que está na tela.

**Por que `useMutation`:** exportar é uma ação disparada por clique, e não um dado exibido na tela. O `useMutation` dá o estado da ação (`isPending`, `isError`) sem precisar de `useState` manual.

**Por que `fetchQuery` em vez de usar os dados já na tela:** o `fetchQuery` usa o cache se ele estiver atualizado e busca de novo se não estiver. A exportação sai sempre com os dados mais recentes do filtro, mesmo que uma venda tenha entrado depois de a lista carregar.

Se der erro, o `onError` registra o log em `Admin › exportação de vendas` (aparece em "Logs de erro") e o cabeçalho mostra "Não foi possível exportar".

---

## 5. Layout e páginas

### `AdminLayout()`

[src/features/admin/pages/AdminLayout.jsx](src/features/admin/pages/AdminLayout.jsx)

A moldura de todas as páginas do admin: menu lateral à esquerda e a página atual à direita (`<Outlet />`).
- `NAV_ITEMS` lista os itens do menu: `to` (rota), `label`, `end` e `Icon`. Para criar uma aba nova, acrescente um item aqui e a rota filha em `app/Router.jsx`.
- Cada item é um `NavLink`. O React Router marca o item da rota atual com `aria-current="page"`, e `navLinkClass` aplica `.navLinkActive` nele.
- `end: true` no Dashboard: sem isso, `/admin` também ficaria marcado em `/admin/erros`, porque `/admin` é o começo do caminho.

**Rotas** ([Router.jsx](src/app/Router.jsx)):
```js
{ path: "/admin", element: <PrivateRoute />, children: [
  { element: <AdminLayout />, children: [
    { index: true, element: <AdminPanel /> },
    { path: "erros", element: <ErrorsPage /> },
  ] },
] }
```
O `AdminLayout` é uma rota sem `path` (rota de layout): ele envolve as filhas sem mudar o endereço, e continua protegido pelo `PrivateRoute`.

**CSS** ([AdminLayout.module.css](src/features/admin/pages/AdminLayout.module.css)):
- `.layout`: declara **todas as variáveis de cor do admin** (fundo cinza `#f4f5f7`, cards brancos, borda `#e5e7eb`, texto `#111827`, roxo `#4f46e5`, verde, vermelho e as cores do menu). Todos os componentes do admin leem daqui. Também define a fonte (`system-ui`) e o layout em linha (menu + conteúdo).
- `.sidebar`: menu de 240px, escuro (`#111827`).
- `.navLink`: item do menu, cinza, com fundo mais claro no hover e anel roxo no foco por teclado. `.navLinkActive`: item atual, com fundo roxo e texto branco.
- `.main`: área da página, que **rola sozinha** (`overflow-y: auto`), enquanto o menu fica parado.

### `AdminPanel()` (Dashboard)

[src/features/admin/pages/AdminPanel.jsx](src/features/admin/pages/AdminPanel.jsx)

`PageHeader` com o título "Dashboard" e os `SalesFilters` à direita, e abaixo a grade de widgets. Cada widget fica dentro de um `ErrorBoundary` (e de um `Suspense` com `WidgetFallback`, se ele carrega dados), para um widget com erro ou carregando não afetar os outros.

**Grade** ([AdminPanel.module.css](src/features/admin/pages/AdminPanel.module.css)):
- `.grid`: 3 colunas iguais, linhas de no mínimo 240px e 24px de espaço.
- `.salesArea`: Vendas cadastradas ocupa **2 colunas e 2 linhas**, com no máximo 640px de altura. A lista rola por dentro.
- Os outros widgets ocupam 1 coluna cada e vão preenchendo a grade na ordem: os dois rankings ficam empilhados à direita das vendas.
- **Widgets novos:** coloque o componente dentro do `.grid`. Por padrão ele ocupa 1 coluna. Para ocupar 2, envolva com `<div className={styles.wide}>`; para a largura toda, `<div className={styles.full}>`.
- Abaixo de 1100px de largura a grade vira 1 coluna.

### `ErrorsPage()` (Erros)

[src/features/admin/pages/ErrorsPage.jsx](src/features/admin/pages/ErrorsPage.jsx)

`PageHeader` com o título "Erros" e uma grade de 2 colunas com **Logs de erro** e **Logs de teste**, que ocupam a altura da tela e rolam por dentro. Detalhes dos dois widgets em [ERROS_E_LOGS.md](ERROS_E_LOGS.md).

---

## 6. Componentes

### `PageHeader({ title, description, children })`

[src/features/admin/components/PageHeader/PageHeader.jsx](src/features/admin/components/PageHeader/PageHeader.jsx)

Título da página (`<h1>`, 24px), descrição em cinza e, à direita, o que vier em `children` (no Dashboard, os filtros). Em telas estreitas, as ações descem para baixo do título.

### `SalesFilters({ selectedVendorId, onVendorChange, selectedWeek, onWeekChange })`

[src/features/admin/components/SalesFilters/SalesFilters.jsx](src/features/admin/components/SalesFilters/SalesFilters.jsx)

Substituiu o antigo `Header`, já que o logo foi para o menu lateral. Da esquerda para a direita:
- **Semana:** "Todas as semanas" (valor `""`) e uma opção por semana de `useWeekOptions` (valor = chave da semana, texto = `label`). Controlado por `selectedWeek`/`onWeekChange`, com `aria-label="Filtrar por semana"`.
- **Vendedor:** "Todos" (valor `""`) e um item por vendedor (valor `_id`, texto `getVendorLabel(vendor)`). Controlado por `selectedVendorId`/`onVendorChange`, com `aria-label="Filtrar por vendedor"`. Se a lista não carregar, mostra uma opção desabilitada "Não foi possível carregar os vendedores".
- **Exportar:** chama `exportSales({ vendor: selectedVendor, weekKey: selectedWeek })`, em que `selectedVendor` é o vendedor da lista com o `_id` selecionado, ou `null`. Durante a exportação fica desabilitado e mostra "Exportando...". Se a última exportação falhou, aparece "Não foi possível exportar" em vermelho acima do botão.

**CSS** ([SalesFilters.module.css](src/features/admin/components/SalesFilters/SalesFilters.module.css)):
- `.field` + `.label`: cada controle tem um rótulo pequeno em caixa alta acima ("SEMANA", "VENDEDOR").
- `.select`: 40px de altura, borda cinza, cantos de 8px e `appearance: none` com uma seta própria (SVG no `background`), para ficar igual em todos os navegadores. No hover a borda escurece; no foco por teclado a borda fica roxa com um anel roxo claro.
- `.exportButton`: botão roxo cheio com o ícone de download, mais escuro no hover, anel no foco e 60% de opacidade quando desabilitado.

### `Icons`

[src/features/admin/components/Icons/Icons.jsx](src/features/admin/components/Icons/Icons.jsx): `DashboardIcon`, `AlertIcon` e `DownloadIcon`, ícones SVG em linha que herdam a cor do texto (`stroke="currentColor"`) e ficam escondidos de leitores de tela (`aria-hidden`). São desenhados à mão, sem biblioteca de ícones.

### `WidgetFallback({ title })`

[src/features/admin/components/WidgetFallback/WidgetFallback.jsx](src/features/admin/components/WidgetFallback/WidgetFallback.jsx)

O que aparece enquanto um widget carrega: o card com o título certo e três linhas cinzas animadas ("skeleton"). Assim a grade não muda de forma durante o carregamento. Tem `aria-busy="true"`.

### Cards (`.widget`, `.header`, `.title`)

As classes globais dos cards ficam em [global.css](src/shared/styles/global.css): card branco com borda cinza, cantos de 12px e uma sombra bem leve; cabeçalho com linha cinza embaixo; título de 15px em cinza escuro. Antes a linha e o título eram roxos. O `box-sizing` repetido na regra `*` foi removido.

### `SaleWidget({ vendorId, weekKey })`

[src/features/admin/components/SaleWidget/SaleWidget.jsx](src/features/admin/components/SaleWidget/SaleWidget.jsx)

Lista as vendas dos dois filtros, usando a estrutura e as classes que já existiam no componente:

| Parte | Conteúdo |
|---|---|
| Contador | Quantidade de vendas depois dos filtros |
| Nome | `rdDealName` |
| Status | "Ativa" (verde) ou "Cancelada" (vermelho), pelo `dealStatus` |
| Valor | `value` em R$ (`formatCurrency`) |
| Vendedor | `vendorId.vendorName` |
| Passagem | Nomes de todas as pessoas de `sdrIds`, separados por vírgula ("Izabel Ramos, Lucas Daniel"), ou "—" sem passagem. O rótulo vira "Passagens" quando há mais de uma pessoa |
| Data da venda | `realizedAt` em data e hora (`formatDateTime`) |

Sem vendas, mostra "Nenhuma venda encontrada".

**Mudanças no que já existia:**
- A condição do status era `"ativa" ? ... : ...`, sempre verdadeira. Agora compara `sale.dealStatus === "ativa"`.
- O `<dl>` dos detalhes estava dentro do `.itemTop` (a linha de nome, status e valor). Ele foi para baixo dessa linha, que é o layout que o CSS do widget já previa (`.item` em coluna).
- Saiu o `console.log`.

### `RankWidget()`

[src/features/admin/components/RankWidget/RankWidget.jsx](src/features/admin/components/RankWidget/RankWidget.jsx)

Top 3 de vendedores, com **duas abas**: **Vendas** (`sales`, abre nela) e **Renovação** (`farm`).
- `activeType` guarda a aba. As abas são botões com `role="tab"` e `aria-selected`.
- Só a lista fica dentro do `Suspense`. Ao trocar de aba, o cabeçalho com as abas continua na tela e só a lista mostra "Carregando ranking...".
- O `ErrorBoundary` da lista tem `key={activeType}`. Se uma aba der erro, trocar de aba monta um boundary novo, em vez de continuar mostrando o erro.
- `VendorRank({ type })`: busca com `useRankVendors(type)` e entrega para o `RankList`, com `id` igual a `vendorId`.
- [useRankVendors.js](src/features/admin/hooks/useRankVendors.js): `useSuspenseQuery` com a chave `["admin-rank", tipo]`. Cada aba tem o seu cache, então voltar para uma aba já vista é instantâneo.
- CSS: `.tabs` é a caixa cinza das abas; `.tab` é cada aba; `.tabActive` é a aba atual, branca, com texto roxo e sombra leve.

### `SdrRankWidget()`

[src/features/admin/components/SdrRankWidget/SdrRankWidget.jsx](src/features/admin/components/SdrRankWidget/SdrRankWidget.jsx)

Top 3 de passagens (SDR, Suporte e CS) da campanha inteira. Busca com `useRankSdrs()` ([useRankSdrs.js](src/features/admin/hooks/useRankSdrs.js), chave `["admin-rank-sdr"]`) e entrega para o `RankList`, com `id` igual a `sdrId`. Sem passagens, mostra "Nenhuma passagem ainda".

### `RankList({ items, emptyText })`

[src/features/admin/components/RankList/RankList.jsx](src/features/admin/components/RankList/RankList.jsx)

A lista usada pelos dois rankings. Cada item precisa de `id`, `name`, `points` e, opcionalmente, `job`.
- Cada linha tem a medalha com a posição, o nome (com o cargo embaixo) e os pontos à direita ("1 ponto" ou "N pontos").
- `.position1`, `.position2` e `.position3` pintam a medalha de dourado, prata e bronze.
- Nomes longos são cortados com reticências.
- Lista vazia mostra `emptyText`.

**Por que um componente só:** os dois rankings têm o mesmo visual. Um widget novo de ranking só precisa buscar os dados e entregar `items` no formato acima.

---

## 7. Utilitários

### `salesToCsv(sales)`

[src/features/admin/utils/salesCsv.js](src/features/admin/utils/salesCsv.js)

Monta o CSV com uma linha de cabeçalho e uma linha por venda:

| Coluna | Valor |
|---|---|
| Negociação | `rdDealName` |
| Status | "Ativa" ou "Cancelada" |
| Valor (R$) | `1199,50` (número com vírgula, para o Excel tratar como número) |
| Tipo | "Vendas" ou "Renovação" |
| Segmento | "B2B" ou "B2G" |
| Vendedor | `vendorId.vendorName` |
| Passagem | Nomes de todas as pessoas da passagem na mesma célula, separados por vírgula ("Izabel Ramos, Lucas Daniel"), vazio sem passagem |
| Data da venda | `09/10/2026 11:07` |
| ID na RD | `rdDealId` |

**Por que esse formato:**
- **`;` como separador:** o Excel em português usa a vírgula como separador decimal, então espera `;` entre as colunas. Com `,`, tudo cairia numa coluna só.
- **BOM (`﻿`) no início:** avisa o Excel que o arquivo é UTF-8. Sem ele, "Negociação" e "Renovação" aparecem com caracteres quebrados.
- **`\r\n` entre as linhas:** é o padrão do formato CSV e o que o Excel espera.
- As colunas ficam no array `COLUMNS`. Para incluir, tirar ou reordenar uma coluna, basta mexer nele.

### `escapeCsvCell(value)`
Prepara um valor para uma célula. Se o texto tiver `;`, aspas ou quebra de linha, ele vai entre aspas e as aspas internas são dobradas (`Obra "A"` vira `"Obra ""A"""`). `null` e `undefined` viram célula vazia. Sem isso, um nome de negociação com `;` quebraria as colunas.

### `buildExportFileName({ vendor, weekKey }, date)`
Monta o nome do arquivo: `vendas-<vendedor ou todos>[-semana-<segunda da semana>]-<data de hoje>.csv`. Exemplos: `vendas-todos-2026-10-22.csv` e `vendas-carla-semana-2026-10-12-2026-10-22.csv`.
- O nome do vendedor vira um "slug": sem acento, minúsculo, com hífens (`Gabriela Antônia` vira `gabriela-antonia`). Sem nome no cadastro, usa o `_id` do vendedor.
- A data é a do computador (`toLocaleDateString("sv-SE")` gera `AAAA-MM-DD`), e não a de UTC, para não virar o dia seguinte à noite.

### Semanas

[src/features/admin/utils/weeks.js](src/features/admin/utils/weeks.js)

A semana segue **a mesma regra do backend** (`getWeekRange` no `salesService`): de segunda 00:00 a domingo 23:59:59, no horário de São Paulo. Assim a "semana passada" do admin bate com a dos rankings das TVs.

O Brasil não tem mais horário de verão, então São Paulo é sempre UTC−3. As funções usam esse deslocamento fixo (`SAO_PAULO_OFFSET_MS`) e os métodos `getUTC*`. O resultado é o mesmo em qualquer computador, mesmo que o fuso do navegador seja outro.

Uma semana é identificada pela **chave**: a data da segunda-feira, como `"2026-10-12"`. É texto simples, então serve como `value` do `<select>` e como parte do nome do arquivo, e dá para comparar duas chaves com `<`.

| Função | O que faz |
|---|---|
| `getWeekKey(data)` | Devolve a chave da semana da data, no horário de São Paulo. Domingo 23:59 ainda é da semana que acaba; segunda 00:00 já é a nova |
| `previousWeekKey(chave)` | Chave da semana anterior (7 dias antes), inclusive na virada de mês e de ano |
| `getWeekRange(chave)` | `{ start, end }`: de segunda 00:00 (São Paulo) até a segunda seguinte 00:00, como instantes UTC. O fim é **exclusivo** |
| `formatWeekLabel(chave, agora)` | Texto da opção: "Semana atual (19/10 a 25/10)", "Semana passada (12/10 a 18/10)" ou só "05/10 a 11/10" |
| `getFirstWeekOfMonth(agora)` | Chave da semana do dia 1º do mês atual, no horário de São Paulo. Se o mês começa numa quinta, é a semana que começou na segunda do mês anterior (1º/10/2026 → `"2026-09-28"`) |
| `listWeeks(vendas, agora)` | Lista `{ key, label }` da semana atual até a mais antiga entre a semana do dia 1º do mês e a semana da venda mais antiga, da mais nova para a mais antiga. Inclui semanas sem venda, para dar para filtrar qualquer semana do mês (por exemplo, duas semanas atrás) mesmo antes de haver vendas nelas |
| `filterSalesByWeek(vendas, chave)` | Sem chave, devolve as vendas como vieram. Com chave, mantém só as que têm `realizedAt` dentro de `getWeekRange(chave)` |
| `toSaoPauloClock(data)` e `mondayOf(chave)` | Internas: atrasam o relógio em 3h (para os `getUTC*` darem a data de São Paulo) e transformam a chave em `Date` |

**Por que `realizedAt`:** é a data em que a venda foi ganha e nunca muda. O backend usa o mesmo campo nos filtros de semana.

### Passagens

[src/features/admin/utils/passages.js](src/features/admin/utils/passages.js). Uma venda pode ter 0, 1 ou mais passagens (`sdrIds`, uma lista).

| Função | O que faz |
|---|---|
| `getPassagePeople(venda)` | Devolve a lista de pessoas da passagem, já populadas. Ignora entradas vazias (pessoa cujo cadastro foi apagado). Se a venda vier no formato antigo, com um `sdrId` só, devolve uma lista com essa pessoa |
| `formatPassageNames(venda)` | Os nomes da lista separados por vírgula ("Izabel Ramos, Lucas Daniel"), ou `""` sem passagem. É usada na lista de vendas e na coluna "Passagem" do relatório |

Como o separador do CSV é `;`, a vírgula entre os nomes não quebra a coluna.

### `downloadFile(content, fileName, type)`

[src/features/admin/utils/downloadFile.js](src/features/admin/utils/downloadFile.js)

Baixa um texto como arquivo: cria um `Blob`, gera uma URL temporária, clica num link `<a download>` invisível e libera a URL. Funciona em qualquer navegador, sem biblioteca.

### `formatDateTime(value)`
Já existia. Formata a data e a hora no padrão brasileiro. É usada na lista de vendas.

---

## 8. Testes

| Arquivo | Garante |
|---|---|
| `api/slidesApi.test.js` | Sem vendedor busca `/sales/admin`; com vendedor busca `/sales/get/:vendorId`; devolve da mais nova para a mais antiga com o total; busca os vendedores em `/vendor/list`; o ranking manda o tipo e devolve a lista de dentro de `vendor` |
| `utils/salesCsv.test.js` | Começa com BOM e usa `;`; cabeçalho e uma linha por venda com status, valor, tipo, segmento, vendedor, passagem, data e ID traduzidos; passagem vazia sem SDR; várias pessoas da passagem na mesma célula, separadas por vírgula; escapa aspas, `;` e quebras de linha; nome do arquivo com o vendedor ou "todos", sem acento, e com a semana quando filtrada |
| `utils/passages.test.js` | Lista e nomes das pessoas da passagem; lista vazia sem passagem; ignora pessoa não populada; aceita venda antiga com `sdrId` |
| `utils/weeks.test.js` | Semana pela segunda-feira de São Paulo; domingo 23:59 e segunda 00:00 nos limites certos; semana anterior na virada do mês; intervalo de segunda a segunda; nomes "Semana atual" e "Semana passada"; semana do dia 1º do mês (inclusive na virada do mês em São Paulo); todas as semanas do mês mesmo sem vendas; começo do mês; volta mais com venda antes do mês; filtro sem semana devolve tudo; filtro respeita os limites |
| `components/RankWidget/RankWidget.test.jsx` | Abre na aba Vendas com posição, nome, cargo e pontos ("1 ponto" no singular); a aba Renovação busca e mostra o ranking de farm; avisa quando ninguém pontuou |
| `components/SdrRankWidget/SdrRankWidget.test.jsx` | Mostra o ranking de passagens vindo do backend; avisa quando ninguém fez passagem |
| `pages/AdminLayout.test.jsx` | Menu com Dashboard e Erros, abrindo no dashboard marcado; clicar em Erros troca a página sem recarregar e muda o item marcado; abrir direto em `/admin/erros` marca só Erros |
| `pages/ErrorsPage.test.jsx` | Título "Erros" e os widgets de logs de erro e de teste |
| `pages/AdminPanel.test.jsx` | Opções de vendedor em ordem alfabética e de semana com todas as semanas do mês; filtra por uma semana de duas semanas atrás; vendedor sem nome aparece como "Vendedor sem nome" sem esvaziar a lista; avisa quando os vendedores não carregam; sem filtros lista e exporta tudo; só vendedor; só semana; semana + vendedor; semana sem vendas do vendedor mostra lista vazia; voltar para "Todas" e "Todos" mostra e exporta tudo; avisa quando a exportação falha e não baixa nada. Em cada caso confere a lista na tela, o conteúdo do CSV e o nome do arquivo |

Os testes do `AdminPanel` fixam a data em 22/10/2026 (`vi.setSystemTime`), para "Semana atual" e "Semana passada" não dependerem do dia em que rodam.

Os testes foram conferidos quebrando o código de propósito: com a exportação ignorando o vendedor, o teste "só o vendedor" falhou; com a exportação ignorando a semana, os testes "só a semana" e "semana + vendedor" falharam.
