# Painel admin

Como funciona o painel admin (`/admin`): o layout com menu lateral, as quatro páginas (Dashboard, Gráficos, Importação e Erros), os widgets, os filtros por semana e por vendedor e a exportação.

O código não tem comentários de propósito. Toda explicação fica neste documento. Os widgets de logs de erro e de teste estão em [ERROS_E_LOGS.md](ERROS_E_LOGS.md).

---

## 1. Visão geral

### Layout e navegação

```
┌──────────────┬─────────────────────────────────────────────────────┐
│  ORÇA BLACK  │ Dashboard                 [Semana ▾] [Vendedor ▾] [⤓ Exportar] │
│              │ Vendas e rankings da Black Friday                   │
│ ▣ Dashboard  │ ┌──────────────────────────┐ ┌────────────────────┐ │
│ 📈 Gráficos  │ │ Vendas cadastradas       │ │ Rank dos vendedores│ │
│ ⚠ Erros      │ │ (2 colunas × 2 linhas)   │ │ [Vendas|Renovação] │ │
│ (menu escuro)│ │                          │ ├────────────────────┤ │
│              │ │                          │ │ Rank das passagens │ │
│              │ └──────────────────────────┘ └────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────┘
```

| Rota | Página | Conteúdo |
|---|---|---|
| `/admin` | `AdminPanel` (Dashboard) | Filtros, Vendas cadastradas, Rank dos vendedores, Rank das passagens e Pontos por pessoa |
| `/admin/previsao` | `ForecastPage` (Previsão) | Forecast: cenários, indicadores, trajetórias, cálculo do ritmo e semana |
| `/admin/graficos` | `ChartsPage` (Gráficos) | Filtro de semana e os sete gráficos de acompanhamento das vendas |
| `/admin/importacao` | `ImportPage` (Importação) | Importar vendas por CSV (vendas fora da planilha principal) |
| `/admin/erros` | `ErrorsPage` (Erros) | Logs de erro e Logs de teste |
| `/admin/usuarios` | `UsersPage` (Usuários) | Cadastrar usuários, trocar perfil e senha, excluir |

Importação e Erros são **só do master**; Usuários, do master e do admin (ver "Perfis" abaixo). As cinco páginas ficam dentro do `AdminLayout`, que desenha o menu lateral. Trocar de aba é navegação interna do React Router: a página não recarrega, o menu continua no lugar e só o conteúdo da direita muda (SPA). Os endereços `/admin`, `/admin/graficos`, `/admin/importacao` e `/admin/erros` também podem ser abertos direto ou salvos nos favoritos.

### Filtros

- A barra de filtros do Dashboard tem três seletores: **semana**, **vendedor** e **setor**. Semana e vendedor se combinam e valem para a lista de vendas **e** para a exportação. O setor vale para todos os widgets (veja "Filtro de setor" abaixo).
- **Período** (substituiu o antigo filtro de semana, no Dashboard e nos Gráficos): componente [PeriodFilter](src/features/admin/components/PeriodFilter/PeriodFilter.jsx), um seletor com:
  - "Todo o período" (padrão, não filtra nada);
  - **Atalhos:** Últimos 3, 7, 15 e 30 dias (sempre terminando hoje e contando hoje) e Este mês (do dia 1º até hoje);
  - **Semanas:** as mesmas de antes, de `useWeekOptions` (todas as semanas do mês até a atual, "Semana atual" e "Semana passada" com nome);
  - **Período específico...:** abre um calendário ([DateRangePicker](src/features/admin/components/DateRangePicker/DateRangePicker.jsx)). Clique no dia inicial e depois no dia final (pode ser o mesmo dia; se clicar num dia antes do primeiro, as datas são invertidas). Enquanto escolhe, o intervalo até o dia sob o mouse fica marcado e o texto embaixo diz "Clique no dia inicial" / "Agora clique no dia final". As setas ‹ › trocam de mês, o dia de hoje fica sublinhado, e Esc ou clicar fora fecha sem mudar. Depois de escolher, o botão mostra o período ("19/10 a 25/10" ou "qua, 14/10") e clicar nele reabre o calendário. Sem datas escolhidas, nada é filtrado.
  - O estado da tela guarda a escolha (`{ value, from, to }`, começando em `ALL_PERIODS`) e `resolvePeriod` ([utils/periods.js](src/features/admin/utils/periods.js)) transforma em `{ type, key, start, end, label }` (ou `null` para todo o período). `filterSalesByPeriod` filtra pelo dia da venda no horário de São Paulo, incluindo o primeiro e o último dia; `previousPeriod` dá o período anterior do mesmo tamanho (a semana anterior, ou os 7 dias antes dos últimos 7), usado na comparação dos indicadores ("vs semana anterior" ou "vs período anterior"). Os widgets e hooks recebem esse `period` no lugar da antiga `weekKey`.
  - Nome dos arquivos: semana continua `-semana-2026-10-19`; os outros períodos viram `-2026-10-20-a-2026-10-22`.
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

- Semana e vendedor valem **só para a lista de vendas e para a exportação**. Os rankings mostram a campanha inteira, porque o backend só filtra ranking por "semana atual" ou "tudo", e não por semana específica nem por vendedor.

### Perfis

Seis perfis, que vêm do backend em `user.role` (login e refresh):

| Perfil | Menu | Filtro de setor | Vendas que chegam do backend | Tela Usuários |
|---|---|---|---|---|
| `master` | Dashboard, Gráficos, Previsão, Prêmios, Cadastro de metas, Metas por vendedor, Importação, Erros, Usuários | Todos, B2B e B2G | todas | cadastra, troca perfil e senha, exclui |
| `admin` | Dashboard, Gráficos, Previsão, Prêmios, Cadastro de metas, Metas por vendedor, Usuários | Todos, B2B e B2G | todas | só vê e cadastra |
| `b2b` | Dashboard, Gráficos, Previsão e Prêmios | travado em B2B | só B2B | — |
| `b2g` | Dashboard, Gráficos, Previsão e Prêmios | travado em B2G | só B2G | — |
| `vendor` | só **Minha área** | — | só as dele (`/me/sales`) | — |
| `sdr` | só **Minha área** | — | só as da passagem dele (`/me/sales`) | — |

- O `master` é definido no backend pela variável `MASTER_EMAIL`. Sem ela, o backend manda todo admin como `master` (como era antes).
- `getPermissions(role)` ([auth/utils/permissions.js](src/features/auth/utils/permissions.js)) devolve `{ role, isMaster, canSeeUsers, segment, isPerson, canSeeAdmin, canSeeGoals }`. `isPerson` é `true` só para `vendor` e `sdr`; `canSeeAdmin` é o contrário. `canSeeGoals` (telas de metas) é `true` só para `master` e `admin`, durante o teste com o gestor. Sem perfil (backend antigo, sem perfis) = acesso total, como era antes.
- `usePermissions()` ([auth/hooks/usePermissions.js](src/features/auth/hooks/usePermissions.js)) lê o usuário do `AuthContext` e soma o `userId`. Fora do provider (teste de componente solto) vale como admin.
- `RestrictedRoute({ allow })` ([app/RestrictedRoute.jsx](src/app/RestrictedRoute.jsx)) envolve as rotas restritas: `allow="isMaster"` em Importação e Erros, `allow="canSeeUsers"` em Usuários, `allow="canSeeGoals"` em Cadastro de metas e Metas por vendedor. Sem a permissão, abrir pelo endereço volta para `/admin` (ou para o `redirectTo` passado). O `/admin` inteiro fica dentro de `RestrictedRoute allow="canSeeAdmin" redirectTo="/minha-area"`, e `/minha-area` dentro de `allow="isPerson"`: colaborador que abre o admin vai para a própria área, e os outros perfis que abrem `/minha-area` voltam para o Dashboard.
- **A segurança de verdade é do backend**: ele filtra as vendas pelo setor e responde 403 nas rotas do admin. O front só esconde o que a pessoa não pode usar.
- As TVs (`/`) não usam login e continuam públicas.

### Filtro de setor (Dashboard e Gráficos)

Para b2b/b2g o seletor já abre no setor do usuário, desabilitado e só com essa opção (`getSegmentOptions(setorDoUsuário)`).

Seletor **Setor** com "Todos" (padrão), "B2B" e "B2G". As opções ficam em `SEGMENT_OPTIONS` ([utils/segments.js](src/features/admin/utils/segments.js)) e `filterSalesBySegment(vendas, setor)` filtra pelo campo `segment` da venda (sem diferenciar maiúsculas). Com "Todos" nada é filtrado e tudo fica como antes. Cada página tem o seu estado: filtrar o Dashboard não muda os Gráficos.

| Widget | Com B2B ou B2G |
|---|---|
| Vendas cadastradas e exportação | Só as vendas do setor. O arquivo ganha o setor no nome: `vendas-todos-b2g-2026-10-22.csv` |
| Meta da Black Friday | Compara com a **meta do setor** (B2B 2 mi, B2G 1 mi, de `goal.segments`): "de R$ 1.000.000,00 (meta B2G)", o percentual na barra e "Faltam R$ X" (ou "Meta batida!"). Para o admin, acrescenta "· B2G representa 56,6% do total vendido"; para b2b/b2g não (seria sempre 100%). Sem meta do setor no backend, volta ao comportamento antigo: contra a meta total, "(meta total)" e só a participação. As listas de vendas, passagens e renovações contam só as vendas do setor |
| Rank dos vendedores | Vem do backend com `?segment=b2b|b2g` (`GET /analytics/ranking`), com a tabela de pontos real do backend. Sem setor, a chamada é a mesma de sempre |
| Rank das passagens | Também vem do backend com `?segment=` (`GET /analytics/sdr-ranking`) |
| Pontos por pessoa | Vem do backend com `?segment=` (`GET /analytics/people-points`): só os pontos das vendas do setor |
| Todos os gráficos e indicadores | Só as vendas do setor. "Acumulado x meta" e o indicador de meta ("Meta B2B") usam a **meta do setor** e dizem isso na descrição ("B2B contra a meta de B2B"). Sem meta do setor no backend, usam a meta total ("contra a meta total"). O CSV de cada gráfico também leva o setor no nome |

A meta do setor vem de `getSegmentGoal(goal, setor)` ([utils/segments.js](src/features/admin/utils/segments.js)), que devolve `{ value, isTotal }`: `isTotal: true` quando caiu na meta total (sem setor ou sem `goal.segments`).

Os rankings por setor deixaram de ser calculados no front (a cópia da tabela de pontos, `segmentRanking.js`, saiu): o backend passou a aceitar `?segment=` nas rotas de ranking. A meta do setor usa `useSegmentTotal(setor)` ([hooks/useSegmentTotal.js](src/features/admin/hooks/useSegmentTotal.js)), que devolve `{ total, allSegments }`.

**Data das vendas:** a "Data da venda" vem da planilha pelo Apps Script como data à meia-noite no fuso da planilha, e o backend espera meia-noite de São Paulo (`2026-10-03T03:00:00.000Z`, nos testes e no `ROTAS.md`), com semanas no fuso de São Paulo (RN-29 do `projeto.md`). O front usa a mesma regra (`getDayKey` converte para São Paulo), então dia, semana e período batem com os rankings do backend. Isso depende de a planilha estar no fuso **(GMT-03:00) São Paulo** (Arquivo → Configurações); se estiver em outro fuso, o front e o backend erram o dia do mesmo jeito.

`useAdminSales`, `useSectorCounts`, `useSalesCharts` e `useSalesInsights` ganharam o parâmetro `segment` (padrão `""`), e `useExportSales` recebe `segment` junto com vendedor e semana.

```
AdminPanel
  ├── selectedVendorId (useState, "" = Todos)
  ├── periodSelection  (useState, ALL_PERIODS) → period = resolvePeriod(periodSelection)
  ├── selectedSegment  (useState, "" = Todos)
  ├── SalesFilters(vendedor, período, setor)
  │     ├── useVendors      → GET /vendor/list                       (opções de vendedor)
  │     ├── PeriodFilter    → useWeekOptions → GET /sales/admin      (atalhos, semanas e período específico)
  │     └── useExportSales  → fetchQuery(vendedor) → filterSalesByPeriod → filterSalesBySegment → salesToCsv → downloadFile
  ├── SaleWidget(vendorId, period, segment)
  │     └── useAdminSales   → GET /sales/admin ou /sales/get/:vendorId → filterSalesByPeriod → filterSalesBySegment
  ├── RankWidget            → abas Vendas/Renovação → GET /analytics/ranking?vendorDepartment=...
  └── SdrRankWidget         → GET /analytics/sdr-ranking
```

---

## 2. Onde fica o filtro

[src/features/admin/pages/AdminPanel.jsx](src/features/admin/pages/AdminPanel.jsx)

`AdminPanel` guarda os filtros com `useState`:
- `selectedVendorId`: `""` significa "Todos"; senão, o `_id` do vendedor.
- `periodSelection`: a escolha do filtro de período (`{ value, from, to }`); `period` é ela resolvida com `resolvePeriod` (em `useMemo`), ou `null` para todo o período. Uma semana continua usando a **chave da semana** (a segunda-feira, `"2026-10-12"`) como `value`.
- `selectedSegment`: `""`, `"B2B"` ou `"B2G"`.

O `SalesFilters` recebe os valores e as funções para trocar (`onVendorChange`, `onPeriodChange`, `onSegmentChange`). O `SaleWidget` recebe `vendorId`, `period` e `segment`.

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

### `getGoal()`
`GET /analytics/goal`. Devolve `{ goal, total, percent }`: a meta em reais, o total já vendido e o percentual atingido. É a mesma rota da tela "Meta Black" da TV. Usada pelo `GoalWidget` e pelo gráfico "Acumulado x meta".

### `getTeams()`
`GET /analytics/scoreboard?period=all`. O admin não tem uma rota só de equipes, então usa o placar geral das TVs e guarda só `{ teamId, teamName }` de cada equipe. Usada pelo gráfico "Vendas por equipe", que liga cada venda à equipe pelo `teamId` do vendedor (`sale.vendorId.teamId`).

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

### `useAdminSales(vendorId, period, segment)`
[useAdminSales.js](src/features/admin/hooks/useAdminSales.js) roda `useSuspenseQuery(adminSalesQuery(vendorId))` com um `select` que aplica `filterSalesByPeriod(sales, period)` e depois `filterSalesBySegment`. Devolve `{ sales, total }`, em que `total` é a quantidade **depois** dos filtros, a que aparece no contador.
- **Trocar de vendedor** muda a chave: o widget suspende e mostra "Carregando dados..." até a resposta chegar (ou na hora, se aquele vendedor já está no cache).
- **Trocar de semana** não muda a chave: o `select` roda de novo sobre os dados que já estão no cache, sem requisição e sem "Carregando".
- O `select` é criado com `useCallback` dependendo de `period` e `segment`, para só refazer o filtro quando eles mudam.

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

`exportSales({ vendor, period, segment })` recebe o vendedor selecionado (ou `null` para "Todos"), o período (ou `null`) e o setor e:
1. busca as vendas com `queryClient.fetchQuery(adminSalesQuery(vendor?._id))`, a mesma busca da lista;
2. aplica `filterSalesByPeriod` e `filterSalesBySegment`, os mesmos filtros da lista;
3. monta o CSV com `salesToCsv`;
4. baixa o arquivo com `downloadFile`, com o nome de `buildExportFileName({ vendor, period, segment })`.

A lista e a exportação usam **as mesmas duas funções** (`adminSalesQuery` e `filterSalesByWeek`), então o arquivo sempre tem exatamente o que está na tela.

**Por que `useMutation`:** exportar é uma ação disparada por clique, e não um dado exibido na tela. O `useMutation` dá o estado da ação (`isPending`, `isError`) sem precisar de `useState` manual.

**Por que `fetchQuery` em vez de usar os dados já na tela:** o `fetchQuery` usa o cache se ele estiver atualizado e busca de novo se não estiver. A exportação sai sempre com os dados mais recentes do filtro, mesmo que uma venda tenha entrado depois de a lista carregar.

Se der erro, o `onError` registra o log em `Admin › exportação de vendas` (aparece em "Logs de erro") e o cabeçalho mostra "Não foi possível exportar".

---

## 5. Layout e páginas

### `AdminLayout()`

[src/features/admin/pages/AdminLayout.jsx](src/features/admin/pages/AdminLayout.jsx)

A moldura de todas as páginas do admin: menu lateral à esquerda e a página atual à direita (`<Outlet />`).
- `NAV_ITEMS` lista os itens do menu: `to` (rota), `label`, `end`, `Icon` e `allow` (permissão de `getPermissions` que mostra o item: `isMaster` ou `canSeeUsers`). Para criar uma aba nova, acrescente um item aqui e a rota filha em `app/Router.jsx`.
- Cada item é um `NavLink`. O React Router marca o item da rota atual com `aria-current="page"`, e `navLinkClass` aplica `.navLinkActive` nele.
- `end: true` no Dashboard: sem isso, `/admin` também ficaria marcado em `/admin/erros`, porque `/admin` é o começo do caminho.

**Modo escuro (admin inteiro):**
- O botão **Modo escuro** fica no pé do menu lateral (`.themeToggle`, empurrado para baixo com `margin-top: auto`). Ele tem `aria-pressed` e mostra a lua no claro e o sol no escuro. Vale para todas as telas do admin: Dashboard, Gráficos, Previsão, Importação, Erros e Usuários. As telas da TV e o login não mudam.
- **Contexto:** o tema fica no `ThemeContext` ([src/shared/context/ThemeContext.jsx](src/shared/context/ThemeContext.jsx)), no mesmo padrão do `AuthContext`. O `ThemeContextProvider` envolve o app no `main.jsx` e guarda `theme` (`"light"` ou `"dark"`), `isDark` e `toggleTheme`. Os componentes leem com `useTheme()` ([src/shared/hooks/useTheme.js](src/shared/hooks/useTheme.js)); fora do provider (um componente solto nos testes), `useTheme` devolve o tema claro e um `toggleTheme` que não faz nada. O objeto do contexto fica num arquivo separado ([themeContext.js](src/shared/context/themeContext.js)) para o arquivo do provider exportar só componentes.
- **Fica salvo:** a escolha vai para o `localStorage` (chave `admin-theme`) sempre que muda, e é lida ao abrir o sistema. Se ainda não houver nada salvo, aproveita a escolha do antigo botão da aba Gráficos (chave `admin-charts-theme`). Leitura e gravação ficam em `try/catch`, porque o navegador pode bloquear o armazenamento; nesse caso abre no claro.
- **Como as cores mudam:** o `AdminLayout` coloca `data-theme="light"` ou `"dark"` na moldura. No `AdminLayout.module.css`, `.layout[data-theme="dark"]` troca as variáveis de cor (`--color-background`, `--color-surface`, `--color-text`, `--color-primary` etc.) e põe `color-scheme: dark`, para os campos nativos (seletor, barra de rolagem) também ficarem escuros. Como todos os componentes usam essas variáveis, nenhum precisou de regra própria de modo escuro. Os gráficos trocam as cores das séries e do calendário com `:global([data-theme="dark"]) .page` no `ChartsPage.module.css`.
- **Variáveis novas** (em `.layout`, com versão clara e escura):
  - `--color-on-primary`: a cor do texto em cima de fundo roxo (item ativo do menu, botões Exportar, Confirmar, Salvar, Gerar PDF, dia escolhido no calendário). É branca no claro e quase preta no escuro, porque no escuro o roxo fica mais claro para ser legível como texto. Antes esses lugares usavam `--color-surface` como "branco", o que deixaria o texto invisível no escuro.
  - `--color-sidebar-text-strong`: o texto do menu ao passar o mouse, branco nos dois temas.
  - `--color-border-strong`: a borda dos campos ao passar o mouse (antes era `#d1d5db` fixo).
  - `--rank-1-*`, `--rank-2-*`, `--rank-3-*`: as medalhas de 1º, 2º e 3º do `RankList` (antes eram cores fixas claras).
- **Impressão e PDF:** as cores escuras ficam dentro de `@media screen`, então o PDF sai sempre claro, mesmo com o modo escuro ligado.

**Rotas** ([Router.jsx](src/app/Router.jsx)):
```js
{ path: "/admin", element: <PrivateRoute />, children: [
  { element: <AdminLayout />, children: [
    { index: true, element: <AdminPanel /> },
    { path: "graficos", element: <ChartsPage /> },
    { element: <RestrictedRoute allow="isMaster" />, children: [
      { path: "importacao", element: <ImportPage /> },
      { path: "erros", element: <ErrorsPage /> },
    ] },
    { element: <RestrictedRoute allow="canSeeUsers" />, children: [
      { path: "usuarios", element: <UsersPage /> },
    ] },
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
- O `GoalWidget` fica no topo, dentro de `.full`, ocupando a largura toda.
- Os outros widgets ocupam 1 coluna cada e vão preenchendo a grade na ordem: os dois rankings ficam empilhados à direita das vendas.
- **Widgets novos:** coloque o componente dentro do `.grid`. Por padrão ele ocupa 1 coluna. Para ocupar 2, envolva com `<div className={styles.wide}>`; para a largura toda, `<div className={styles.full}>`.
- Abaixo de 1100px de largura a grade vira 1 coluna.

### `ErrorsPage()` (Erros)

[src/features/admin/pages/ErrorsPage.jsx](src/features/admin/pages/ErrorsPage.jsx)

`PageHeader` com o título "Erros" e uma grade de 2 colunas com **Logs de erro** e **Logs de teste**, que ocupam a altura da tela e rolam por dentro. Detalhes dos dois widgets em [ERROS_E_LOGS.md](ERROS_E_LOGS.md).

### `ImportPage()` (Importação)

[src/features/admin/pages/ImportPage.jsx](src/features/admin/pages/ImportPage.jsx)

`PageHeader` com o título "Importação" e o widget **Importar vendas** ([ImportSalesWidget](src/features/admin/components/ImportSalesWidget/ImportSalesWidget.jsx)). É a única ação do admin que grava no banco. Regras completas no `projeto.md` (4.11) e no `ROTAS.md` do backend.

1. Escolher o CSV (baixado do Sheets ou do Excel). `readCsvFile` ([api/importApi.js](src/features/admin/api/importApi.js)) lê em UTF-8 e, se não for, em Windows-1252 (CSV do Excel em português), para não quebrar os acentos.
2. A prévia (`previewImport` → `POST /sales/import/preview`, nunca grava) mostra as vendas importadas hoje, o que o arquivo traz (quantidade, valor, com e sem vendedor) e as listas de **erros**, **possíveis duplicadas**, **avisos** e **linhas ignoradas**, sempre com o número da linha do arquivo.
3. **Confirmar importação** (`importSales` → `POST /sales/import`) fica desabilitado se houver erro ou se o arquivo não tiver vendas. O arquivo **substitui** todas as vendas importadas antes; as da planilha principal nunca mudam. Se o backend recusar (400 com o resumo), a tela mostra "nada foi importado" e os erros.
4. Depois de importar, `useImportSales` ([hooks/useImportSales.js](src/features/admin/hooks/useImportSales.js)) invalida vendas, meta e rankings do admin. As TVs atualizam pelo SSE (`sale-updated`, sem popup).

Com `VITE_USE_MOCKS=true` a importação não chama o backend e mostra o erro "A importação não funciona com os dados de demonstração".

### `ForecastPage()` (Previsão)

[src/features/admin/pages/ForecastPage.jsx](src/features/admin/pages/ForecastPage.jsx). Todos os perfis (b2b/b2g com o setor travado). O cálculo é do backend (`GET /analytics/forecast`, regras no `ROTAS.md` do backend); o front só exibe. Widgets em [ForecastWidgets.jsx](src/features/admin/components/ForecastWidgets/ForecastWidgets.jsx), todos com `useForecast(setor)` ([hooks/useForecast.js](src/features/admin/hooks/useForecast.js), chave `["admin-forecast", setor]`):

| Widget | Mostra |
|---|---|
| `ForecastScenarios` (Cenários da campanha) | Realista (em destaque), Pessimista, Otimista e Meta (do setor ou total), com o % da meta |
| `ForecastTrajectoryChart` (Trajetórias do forecast) | Vendido acumulado até hoje e as 3 trajetórias até 01/12, com a meta de referência. Eixo só com dias produtivos |
| `ForecastIndicators` (Indicadores do forecast) | Ritmo atual, ritmo necessário, cobertura (com o aviso de que não é chance), gap e chance de bater a meta ("Sem histórico suficiente" se o backend mandar `null`) |
| `ForecastPace` (Como o ritmo é calculado) | As médias de 7, 30 dias e da campanha com os pesos, e o ritmo resultante |
| `WeekForecast` (Forecast da semana) | Vendido na semana e os 3 cenários (sem meta semanal) |

Na tela Gráficos, o widget **Forecast** (`ForecastSummary`) é a única previsão: o antigo card "Previsão de fechamento" (média simples, dias corridos) saiu, porque dava um número diferente para a mesma pergunta. O "Acumulado x meta" também desenha o cenário realista e o ritmo necessário a partir deste forecast. O card **Forecast da semana** mostra a meta semanal automática (`weekGoal`) quando o backend manda.

Com `VITE_USE_MOCKS=true`, `/analytics/forecast` usa [mocks/mockForecast.js](src/shared/mocks/mockForecast.js), uma cópia do cálculo do backend (o `mockForecast.test.js` confere os números do PDF). **Se mudar a regra no backend, mude a cópia também.**

### `PrizesPage()` (Prêmios)

[src/features/admin/pages/PrizesPage.jsx](src/features/admin/pages/PrizesPage.jsx). Todos os perfis do admin (b2b/b2g com o setor travado). O cálculo é do backend (`GET /prizes`, regras RN-66 a RN-68 no `projeto.md` do backend); o front só exibe. A cada 10 pontos acumulados, 1 prêmio. O acumulado conta **todos os pontos até agora, inclusive os da semana atual** (os prêmios são entregues na segunda); a sobra passa para a semana seguinte. Vale para vendedores e pessoas de passagem (SDR, CS, Suporte). Widgets em [PrizesWidgets.jsx](src/features/admin/components/PrizesWidgets/PrizesWidgets.jsx):

| Widget | Mostra |
|---|---|
| `PrizeBalances` (Saldo de prêmios) | Tabela: pessoa, equipe, acumulado, retirados, saldo (verde com prêmio para retirar, vermelho "Devendo X pontos") e quanto falta para o próximo. Filtros de equipe, tipo e "Só quem tem prêmio para retirar" |
| `PrizeHistory` (Retiradas registradas) | Histórico das retiradas (dia, pessoa e quantidade) |

- **Só o master** vê o botão **Registrar retirada** (abre o formulário na linha: quantidade e dia, que já vem com a segunda da semana; qual prêmio não é cadastrado) e o **Excluir** do histórico. Acima do saldo, o formulário avisa e pede confirmação (`window.confirm`); confirmado, manda `confirmOverBalance: true`. O backend também bloqueia sem a confirmação (409, com a mensagem mostrada na tela).
- Venda cancelada depois da retirada: o saldo fica negativo ("Devendo X pontos") e a venda nova só zera, sem dar outro prêmio (regra do backend).
- b2b/b2g veem só as pessoas com cargo do próprio setor; CS e Suporte (sem setor no cargo) só aparecem para master e admin.
- API em [api/prizesApi.js](src/features/admin/api/prizesApi.js) e hooks em [hooks/usePrizes.js](src/features/admin/hooks/usePrizes.js) (chave `["admin-prizes", ...]`; registrar ou excluir recarrega o saldo e o histórico).
- Com `VITE_USE_MOCKS=true`, `/prizes` usa uma cópia das regras em [mocks/mockBackend.js](src/shared/mocks/mockBackend.js) (`getPrizes`, com uma retirada de exemplo) e gravar mostra "O registro de prêmios não funciona com os dados de demonstração". **Se mudar a regra no backend, mude a cópia também.**

### Metas mensais: `GoalsSetupPage()` (Cadastro de metas) e `GoalsProgressPage()` (Metas por vendedor)

Pasta [src/features/goals/](src/features/goals/). Duas telas separadas, fora do Dashboard e das abas que já existiam, porque o gestor vai testar antes de liberar para todo mundo. **Por enquanto só master e admin** veem (`canSeeGoals`); o backend também responde 403 para os outros perfis. A meta das TVs não muda. Regras completas no `projeto.md` do backend (RN-69 a RN-73).

**Regras, em resumo:**
- Tudo em R$. Todo mês, por setor (B2B e B2G): Meta e Super meta do setor e o % de renovação (o resto é venda nova). No mês da campanha também a **Meta black** do setor, que já vem com o valor cadastrado no backend (a mesma das TVs, ex.: B2B 2 mi e B2G 1 mi).
- Níveis de senioridade com peso (ex.: Júnior 1, Pleno 1,5, Sênior 2). A Meta de renovação é dividida pelos pesos entre os Farmers do setor; a de vendas, entre os outros cargos. A Super e a Black descem do mesmo jeito: setor → renovação/vendas pelo mesmo % → pessoas na proporção da Meta de cada uma → semanas na proporção da Meta semanal. Somando todo mundo, dá a meta do setor. Passagem não tem meta.
- A semana vai de segunda a domingo e é do mês em que começa. A meta mensal de cada vendedor é dividida igualmente nas semanas, e a soma das semanas tem que dar a mensal.
- Cada vendedor conta só as vendas ativas do tipo do cargo. Faixas: Meta → Super meta → Meta black (só no mês da campanha). A faixa atual é a primeira ainda não batida; depois da última, o que passar é excedente.

**Cadastro de metas** (`/admin/metas`, [GoalsSetupPage.jsx](src/features/goals/pages/GoalsSetupPage.jsx) e [GoalSetupForm.jsx](src/features/goals/components/GoalSetupForm/GoalSetupForm.jsx)):
- Escolhe o mês e o setor no topo. Três blocos: **Meta do setor** (Meta, Super meta e, no mês da campanha, Meta black em R$, mais o % de renovação; embaixo, a tabela com cada faixa no setor, em renovação e em vendas), **Níveis de senioridade** (nome e peso; adicionar e remover) e **Metas por vendedor** (tabela: tem meta, nível, meta do mês, Super e Black calculadas e uma coluna por semana).
- As metas das pessoas são calculadas sozinhas pelos pesos ([utils/goalDraft.js](src/features/goals/utils/goalDraft.js)). Digitar a meta de alguém fixa aquele valor ("Voltar ao peso" desfaz) e o resto da parte vai para os outros pelos pesos. Digitar uma semana fixa as semanas daquela pessoa. **Redistribuir pelos pesos** desfaz todos os ajustes.
- "Renovação/Vendas: distribuído X de Y" fica verde quando fecha e vermelho quando não. Semana que não fecha fica com o campo vermelho. **Salvar metas** só libera quando tudo fecha (o backend confere de novo).
- Mês sem metas: vem preenchido com o último mês salvo (metas do setor, percentual, níveis e o nível de cada pessoa) e um aviso; sem nenhum mês anterior, começa em branco com 50% de renovação e Júnior, Pleno e Sênior.
- **Excluir metas do mês** (com confirmação) apaga só aquele mês e setor.
- Os valores são comparados em centavos ([utils/goalMath.js](src/features/goals/utils/goalMath.js), cópia das regras de `goalCalculator.js` do backend), então a soma sempre fecha. **Se mudar a regra no backend, mude a cópia também.**

**Metas por vendedor** (`/admin/metas/vendedores`, [GoalsProgressPage.jsx](src/features/goals/pages/GoalsProgressPage.jsx)), com mês e filtro de setor (Todos, B2B, B2G):
- Cards do resumo: vendedores com meta, quantos bateram a Meta, a Super e a Black, no ritmo e atrasados.
- Por setor: card do **mês** e da **semana atual** ([GoalTierCard](src/features/goals/components/GoalTierCard/GoalTierCard.jsx)), que mostra **só a faixa atual** (bateu a Meta, o card passa a mostrar a Super; bateu a Super, a Black; depois disso, o excedente), com quanto falta, situação, ritmo por dia e projeção. Embaixo, o realizado de renovação e de vendas contra a parte de cada um, e o gráfico de evolução do mês (realizado acumulado x ritmo que bate a Meta).
- **Quanto cada vendedor já fez da Meta do mês**: barra do realizado ÷ Meta, na cor da faixa que a pessoa está buscando, com marcas na Meta (100%), na Super e na Black.
- **Metas por time** (só com "Todos"): soma das metas e do realizado das pessoas de cada time.
- **Vendedores**: tabela com meta, realizado, faixa atual, falta (ou "+excedente"), ritmo por dia, projeção e situação, com CSV. Clicar no nome abre o **detalhe**: os cards do mês e da semana atual (o mesmo widget que o vendedor vai ver quando a área dele for liberada), a tabela das semanas com as três faixas e o gráfico de evolução dele.
- Hooks em [hooks/useGoals.js](src/features/goals/hooks/useGoals.js) (chave `["admin-goals", ...]`, então atualizam sozinhos com as vendas ao vivo; salvar ou excluir recarrega). API em [api/goalsApi.js](src/features/goals/api/goalsApi.js).
- Com `VITE_USE_MOCKS=true`, o mês atual tem metas de exemplo nos dois setores ([mocks/mockGoals.js](src/shared/mocks/mockGoals.js)); os outros meses vêm vazios, e salvar/excluir mostra "O cadastro de metas não funciona com os dados de demonstração".

### `UsersPage()` (Usuários)

[src/features/admin/pages/UsersPage.jsx](src/features/admin/pages/UsersPage.jsx) com o widget [UsersWidget](src/features/admin/components/UsersWidget/UsersWidget.jsx). Master e admin. Substitui o antigo cadastro aberto (`/auth/register`, removido do backend).

- **Cadastrar usuário** (master e admin): email, perfil (Admin, B2B, B2G; Master não aparece), senha e confirmação. Confere no front senha com 6+ caracteres e senhas iguais; erros do backend aparecem com a mensagem dele ("Cadastro já realizado").
- **Lista**: para o master, cada pessoa tem o seletor de perfil (salva na hora), **Trocar senha** (abre o formulário na linha; a pessoa sai das sessões abertas) e **Excluir** (pede confirmação; perde o acesso na hora). Para o admin, a lista só mostra o perfil, sem botões.
- O master aparece como "Master admin", sem seletor e sem Excluir. O próprio usuário aparece com "(você)"; o master troca a própria senha, mas não o perfil (o backend também bloqueia).
- API em [api/usersApi.js](src/features/admin/api/usersApi.js) (`getUsers`, `createUser`, `updateUser`, `deleteUser`) e hooks em [hooks/useUsers.js](src/features/admin/hooks/useUsers.js) (chave `["admin-users"]`). Erros 4xx (digitação) não vão para os logs de erro; falha de rede ou 5xx vão.
- Com `VITE_USE_MOCKS=true` a lista vem vazia e gravar mostra "O cadastro de usuários não funciona com os dados de demonstração".

---

## 6. Componentes

### `PageHeader({ title, description, children })`

[src/features/admin/components/PageHeader/PageHeader.jsx](src/features/admin/components/PageHeader/PageHeader.jsx)

Título da página (`<h1>`, 24px), descrição em cinza e, à direita, o que vier em `children` (no Dashboard, os filtros). Em telas estreitas, as ações descem para baixo do título.

### `SalesFilters({ selectedVendorId, onVendorChange, periodSelection, onPeriodChange, period, selectedSegment, onSegmentChange })`

[src/features/admin/components/SalesFilters/SalesFilters.jsx](src/features/admin/components/SalesFilters/SalesFilters.jsx)

Substituiu o antigo `Header`, já que o logo foi para o menu lateral. Da esquerda para a direita:
- **Período:** `PeriodFilter`, controlado por `periodSelection`/`onPeriodChange`, com `aria-label="Filtrar por período"`. A exportação recebe o `period` já resolvido.
- **Vendedor:** "Todos" (valor `""`) e um item por vendedor (valor `_id`, texto `getVendorLabel(vendor)`). Controlado por `selectedVendorId`/`onVendorChange`, com `aria-label="Filtrar por vendedor"`. Se a lista não carregar, mostra uma opção desabilitada "Não foi possível carregar os vendedores".
- **Exportar:** chama `exportSales({ vendor: selectedVendor, period, segment: selectedSegment })`, em que `selectedVendor` é o vendedor da lista com o `_id` selecionado, ou `null`. Durante a exportação fica desabilitado e mostra "Exportando...". Se a última exportação falhou, aparece "Não foi possível exportar" em vermelho acima do botão.

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

### `SaleWidget({ vendorId, period, segment })`

[src/features/admin/components/SaleWidget/SaleWidget.jsx](src/features/admin/components/SaleWidget/SaleWidget.jsx)

Lista as vendas dos dois filtros, usando a estrutura e as classes que já existiam no componente:

| Parte | Conteúdo |
|---|---|
| Contador | Quantidade de vendas depois dos filtros |
| Nome | `rdDealName`. Os vendedores colocam ali o link da empresa: quando o texto é um endereço de site (com ou sem `https://`, como `www.empresa.com.br`), vira um **link que abre em nova aba** (`target="_blank"`, `rel="noopener noreferrer"`), em azul e sublinhado ao passar o mouse; leitores de tela ouvem "(abre em nova aba)". Quem decide é `toCompanyUrl` ([utils/companyLink.js](src/features/admin/utils/companyLink.js)): só aceita `http`/`https` com domínio de verdade (tem ponto), completa o `https://` quando falta e devolve `null` para nome comum (com espaço, sem ponto) ou outro tipo de endereço (`javascript:`, `mailto:`), que continuam como texto. O CSV continua com o texto original |
| Status | "Concluída" (verde) ou "Cancelada" (vermelho), pelo `dealStatus` (no banco continua `ativa`; só o texto da tag mudou) |
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

### `GoalWidget()`

[src/features/admin/components/GoalWidget/GoalWidget.jsx](src/features/admin/components/GoalWidget/GoalWidget.jsx)

Barra de progresso da meta da Black Friday, no mesmo espírito da tela "Meta Black" da TV, mas com o visual claro do painel. Busca com `useGoal()` ([useGoal.js](src/features/admin/hooks/useGoal.js), `useSuspenseQuery` com a chave `["admin-goal"]`).
- No cabeçalho, o percentual atingido (`7,07%`), formatado em pt-BR com até 2 casas.
- No corpo, o total vendido em destaque e "de R$ meta" ao lado.
- A barra preenche `percent`%, limitada entre 0 e 100: passar da meta deixa a barra cheia, mas o percentual do cabeçalho mostra o valor real (ex.: `150%`).
- Embaixo, "Faltam R$ X" ou, com a meta batida, "Meta batida!" em verde.
- A barra tem `role="progressbar"` com `aria-valuenow`, para leitores de tela.
- À direita da barra, separada por um traço vertical, fica a lista por setor (`SectorSummary`), em três colunas: **Vendas** e **Renovações** por segmento (B2B, B2G) e **Passagens** pelo cargo de quem fez a passagem (SDR, Suporte, CS). Cada coluna mostra o setor e a quantidade; sem nada, mostra "Nenhuma venda", "Nenhuma passagem" ou "Nenhuma renovação".
- `SectorSummary` busca com `useSectorCounts()` e fica dentro de um `Suspense` e de um `ErrorBoundary` próprios. Enquanto as vendas carregam, a barra já aparece e a lista mostra "Carregando setores..."; se as vendas derem erro, só a lista some, a barra continua.
- CSS: `.percent` é o selo roxo do cabeçalho; `.track` é o trilho cinza; `.fill` é o preenchimento roxo, que anima a largura quando o valor muda; `.reached` pinta o texto de verde; `.divider` é o traço vertical de 1px; `.sectors` é a grade de 3 colunas; `.groupTitle` é o título cinza e em maiúsculas de cada coluna; `.groupItem` é a linha com o setor à esquerda e a quantidade em negrito à direita.
- Abaixo de 1100px a lista vai para baixo da barra e o traço vira horizontal; abaixo de 600px as três colunas ficam uma embaixo da outra.

#### `useSectorCounts()`
[useSectorCounts.js](src/features/admin/hooks/useSectorCounts.js) roda `useSuspenseQuery(adminSalesQuery(""))` com um `select` que aplica `countBySector`. Devolve `{ counts }`.

**Por que reaproveitar a query das vendas:** é a mesma chave (`["admin-sales", "all"]`) da lista de Vendas cadastradas sem filtro. As duas compartilham o cache, então abrir o painel faz uma requisição só para as duas.

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

### `buildExportFileName({ vendor, period, segment }, date)`
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
| `getDayKey(data)` | Dia da data no horário de São Paulo, como `"2026-10-21"`. Usado pelos gráficos para saber em que dia cada venda caiu (uma venda às 23h de São Paulo já é 02h UTC do dia seguinte, mas conta no dia certo) |
| `addDays(dia, n)` | O dia `n` dias depois (ou antes, com `n` negativo), no mesmo formato |
| `toSaoPauloClock(data)` e `mondayOf(chave)` | Internas: atrasam o relógio em 3h (para os `getUTC*` darem a data de São Paulo) e transformam a chave em `Date` |

**Por que `realizedAt`:** é a data em que a venda foi ganha e nunca muda. O backend usa o mesmo campo nos filtros de semana.

### Passagens

[src/features/admin/utils/passages.js](src/features/admin/utils/passages.js). Uma venda pode ter 0, 1 ou mais passagens (`sdrIds`, uma lista).

| Função | O que faz |
|---|---|
| `getPassagePeople(venda)` | Devolve a lista de pessoas da passagem, já populadas. Ignora entradas vazias (pessoa cujo cadastro foi apagado). Se a venda vier no formato antigo, com um `sdrId` só, devolve uma lista com essa pessoa |
| `formatPassageNames(venda)` | Os nomes da lista separados por vírgula ("Izabel Ramos, Lucas Daniel"), ou `""` sem passagem. É usada na lista de vendas e na coluna "Passagem" do relatório |

Como o separador do CSV é `;`, a vírgula entre os nomes não quebra a coluna.

### `countBySector(sales)`
[sectorCounts.js](src/features/admin/utils/sectorCounts.js). Recebe a lista de vendas e devolve `{ sales, passages, renewals }`, cada um uma lista de `{ sector, count }` em ordem alfabética do setor.
- Só conta vendas com `dealStatus: "ativa"`, como a meta e os rankings.
- `sales`: vendas com `funnelType` diferente de `"farm"`, agrupadas pelo `segment` em maiúsculas (`B2B`, `B2G`).
- `renewals`: vendas com `funnelType: "farm"`, agrupadas do mesmo jeito.
- `passages`: cada pessoa da passagem (`getPassagePeople`, então aceita `sdrIds` e o `sdrId` antigo) conta 1, agrupada pelo `job`. Uma venda com duas pessoas conta 2 passagens. Entram passagens de vendas e de renovações.
- Venda sem segmento ou pessoa sem cargo entram em "Sem setor".

### `downloadFile(content, fileName, type)`

[src/features/admin/utils/downloadFile.js](src/features/admin/utils/downloadFile.js)

Baixa um texto como arquivo: cria um `Blob`, gera uma URL temporária, clica num link `<a download>` invisível e libera a URL. Funciona em qualquer navegador, sem biblioteca.

### `formatDateTime(value)`
Já existia. Formata a data e a hora no padrão brasileiro. É usada na lista de vendas.

---

## Aba Gráficos

### `ChartsPage()` (Gráficos)

[src/features/admin/pages/ChartsPage.jsx](src/features/admin/pages/ChartsPage.jsx)

`PageHeader` com o título "Gráficos", o botão **Gerar PDF** e o filtro de **período** (o mesmo `PeriodFilter` do Dashboard, com `aria-label="Filtrar gráficos por período"`) e o de setor. Abaixo vêm os **indicadores** (`SalesKpis`) e a grade com os catorze gráficos. O estado dos filtros é separado do Dashboard: filtrar aqui não muda o Dashboard, e vice-versa.

- `CHARTS` lista os gráficos na ordem da grade: `title` (usado no carregamento e no erro), `Chart` (o componente) e `className` opcional.
- Cada gráfico fica dentro de um `ErrorBoundary` e de um `Suspense` com `WidgetFallback`, como no Dashboard. Se um gráfico der erro (por exemplo, as equipes não carregam), só ele mostra o erro.
- Todos os gráficos usam **só as vendas ativas**, como a meta e os rankings. A exceção é "Cancelamentos", que olha as canceladas.
- **Fim da campanha:** vem do backend (`forecast.campaign.end`, `config/campaign.js` de lá). O front não tem mais a data no código.
- **Modo escuro:** vem do botão do menu lateral (veja `AdminLayout`). A aba não tem mais botão próprio; as cores dos gráficos acompanham o `data-theme` do layout.
- **Exportar CSV:** cada card tem um botão "CSV" no canto que baixa os dados daquele gráfico (com a semana no nome do arquivo quando filtrada).
- **Gerar PDF:** o botão "Gerar PDF" abre o [PrintDialog](src/features/admin/components/PrintDialog/PrintDialog.jsx), com uma caixinha para os Indicadores e para cada gráfico, e "Selecionar todos" (já marcado ao abrir; fica "meio marcado" quando só alguns estão escolhidos, e o contador mostra "3 de 15"). Sem nada marcado, o botão de gerar fica desativado. Ao gerar, a página guarda os títulos escolhidos e a hora em `printItems`, chama `window.print()` e o navegador abre a janela de impressão, onde se escolhe "Salvar como PDF". Quando a janela fecha (evento `afterprint`), tudo volta ao normal. Cancelar, clicar fora ou apertar Esc fecha sem imprimir.
- **Como fica o PDF:** regras `@media print` em A4 deitado. Some o menu lateral, os filtros, os botões CSV e a dica do calendário; aparece um cabeçalho "Relatório de vendas · Black Friday" com o período, o setor e a data/hora de geração; os widgets não escolhidos recebem `.notPrinted` (escondidos só na impressão). A grade fica em 2 colunas, os indicadores em 4, nenhum card é cortado no meio entre páginas, e o tema sai sempre **claro**, mesmo com o modo escuro ligado. Com todos marcados, o relatório é a página inteira. Os filtros de período e setor já aplicados valem para o relatório.
- Para os gráficos acompanharem a largura do papel, o SVG do `TimeSeriesChart` ganhou `viewBox` e, na impressão, `width: 100%; height: auto`. Também foram acrescentadas regras de impressão no `global.css` (`html`, `body`, `#root` e `.container` sem altura fixa nem `overflow: hidden`, senão só a primeira página sairia) e no `AdminLayout.module.css` (esconde o menu lateral). Na tela, nada disso muda.
- **CSS** ([ChartsPage.module.css](src/features/admin/pages/ChartsPage.module.css)): grade de 2 colunas; "Vendas por pessoa" e "Ticket médio" ocupam 2 linhas (`.tall`), porque têm uma barra por vendedor. Abaixo de 1100px vira 1 coluna. O seletor reaproveita o visual dos filtros do Dashboard com `composes` do `SalesFilters.module.css`, sem mudar aquele arquivo. Também define `--chart-grid` (cinza das linhas de grade), `--chart-reference` (cinza da linha da meta e da linha do mouse), as cores das séries (`--chart-blue`, `--chart-orange`, `--chart-aqua`, `--chart-rest`) os 6 tons do calendário (`--heat-0` a `--heat-5`) e a cor do número em cima de cada tom (`--heat-text-0` a `--heat-text-5`, escuro nos tons claros e branco nos escuros), cada um com a versão clara e a escura.

**Indicadores** (`SalesKpis`): quatro cartões no topo, seguindo o filtro de semana. Total vendido, vendas fechadas e ticket médio mostram a variação contra a semana anterior (▲ verde / ▼ vermelho, sempre com a seta e o texto, não só a cor). Sem filtro, mostram "Campanha inteira". O quarto cartão é o % da meta da campanha (vem de `getGoal`).

| Gráfico | Tipo | O que mostra | Segue o filtro de semana? |
|---|---|---|---|
| Vendas acumuladas | Linha | Valor vendido somado dia a dia (vendas + renovações) | Sim |
| Vendas acumuladas por setor | Linhas | Uma linha por segmento (B2B, B2G), somando dia a dia | Sim |
| Acumulado x meta | Linha + linha da meta | O acumulado da campanha com a meta como linha horizontal. O eixo vai até o fim da campanha e, a partir de hoje, saem duas linhas tracejadas: **projeção no ritmo atual** (azul) e **ritmo necessário** para bater a meta (laranja, some quando a meta já foi batida) | **Não**: a meta é da campanha inteira |

| Vendas por semana | Colunas | Total de cada semana, vendas e renovações lado a lado, da primeira semana com venda até a atual | **Não**: é a comparação entre semanas |
| Vendas x renovações por dia | Colunas | Valor vendido em cada dia, vendas e renovações lado a lado (não acumula) | Sim |
| Vendas por pessoa | Barras | Total de cada vendedor, do maior para o menor | Sim |
| Vendas por equipe | Barras | Total de cada equipe, do maior para o menor. Equipes sem venda aparecem com R$ 0 | Sim |
| Passagens por pessoa | Barras | Quantas passagens cada pessoa fez, com o cargo embaixo do nome | Sim |
| Ticket médio | Barras | Valor médio por venda, por setor e por pessoa, com a quantidade de vendas embaixo do nome | Sim |
| Participação por setor | Barra 100% | Quanto cada segmento representa do total, com % e valor | Sim |
| Concentração | Número + barra 100% | Quanto % do total vem dos 3 maiores vendedores, e quanto vem dos demais | Sim |
| Cancelamentos | Números + barras | Taxa de cancelamento (canceladas ÷ ativas + canceladas), quantidade, valor perdido e valor cancelado por pessoa | Sim |
| Calendário de vendas | Calendário | Um calendário por mês, com **todos os dias do mês** (1 a 30/31), inclusive os que ainda não chegaram (pontilhados) e os sem venda. Os meses mostrados são os que o período toca (sem filtro: do mês da primeira venda até o mês atual). Dias fora do período ficam apagados. Cada quadrado mostra o dia e, embaixo à direita, quantas vendas teve; a cor fica mais forte com mais vendas. A coluna "Total" soma a semana e a linha "Total" soma cada dia da semana no mês (o que mais vende fica destacado). Passando o mouse, mostra a quantidade e o valor do dia. Não usa horário, porque as vendas são cadastradas só com a data. Aparece mesmo sem vendas | Sim |
| Comparar períodos | Tabela + linhas | Ocupa a largura toda, no topo da grade. Compara dois períodos quaisquer (A e B), cada um escolhido no mesmo calendário do filtro. Atalhos: "Hoje x mesmo dia da semana passada" (ex.: quarta x quarta), "Esta semana x semana passada" (o padrão, até o mesmo dia da semana), "Últimos 7 dias x 7 dias antes" e "Este mês x mês passado" (até o mesmo dia do mês). Mudar uma data à mão troca o atalho para "Personalizado". A tabela mostra total vendido, vendas fechadas, ticket médio, vendas novas, renovações, B2B, B2G e passagens de A e de B, e a diferença de A sobre B (▲ verde / ▼ vermelho; "Novo" quando B é zero). Com períodos de mais de um dia, ao lado vem o valor acumulado dia a dia (Dia 1, Dia 2...) das duas linhas | **Não**: tem os próprios períodos. Segue o filtro de setor |

**Dias do eixo:** sem filtro, vão do dia da primeira venda até hoje. Com uma semana, vão de segunda até domingo, ou até hoje na semana atual. Dias sem venda entram no eixo (a linha acumulada fica reta, a coluna fica vazia).

### Componentes de gráfico

Os gráficos são desenhados em **SVG próprio**, sem biblioteca de gráficos, para não acrescentar dependência ao projeto.

#### `TimeSeriesChart({ title, days, series, variant, reference, formatValue, formatLabel, formatTitle, columnLabel })`

[components/charts/TimeSeriesChart.jsx](src/features/admin/components/charts/TimeSeriesChart.jsx)

Gráfico com os dias no eixo horizontal e reais no vertical.
- `series`: lista de `{ key, label, color, values, dashed? }`, com um valor por dia. Um valor `null` deixa um buraco na linha (é assim que o "Vendido" para em hoje e as linhas tracejadas começam em hoje). `dashed: true` desenha a linha tracejada, sem a bolinha no fim, e a legenda mostra um traço.
- `formatLabel` / `formatTitle` / `columnLabel`: como escrever o rótulo do eixo, o título da dica e da tabela, e o nome da primeira coluna da tabela. O padrão é o dia ("05/10", coluna "Dia"); o "Vendas por semana" usa "Semana de 05/10".
- As cores vão em `style` (e não no atributo `fill`) porque são variáveis CSS (`var(--chart-blue)`), que mudam no modo escuro.
- `variant`: `"line"` (padrão) ou `"columns"`. Em linha, com uma série só, a área embaixo ganha um preenchimento claro (10% da cor). Em colunas, as séries ficam lado a lado em cada dia, com até 24px de largura, cantos de cima arredondados e 2px de espaço entre elas.
- `reference`: opcional, `{ value, label }`. Desenha uma linha horizontal cinza com o texto no canto direito (a meta).
- `formatValue`: formata os valores da dica e da tabela.
- **Escala:** o eixo vertical vai de 0 até um número redondo acima do maior valor (ou da meta), com `niceTicks`. Os rótulos usam reais compactos ("R$ 200 mil", "R$ 3 mi"). Os dias do eixo horizontal aparecem pulando alguns quando não cabem (no mínimo 56px entre rótulos).
- **Legenda:** só aparece com duas séries ou mais. Com uma série, o título do card já diz o que é.
- **Dica (tooltip):** passando o mouse, uma linha vertical (ou uma faixa cinza, nas colunas) marca o dia e uma caixa mostra o dia e o valor de cada série. A caixa troca de lado perto da borda direita. O gráfico também recebe foco pelo Tab, e as **setas ← →** andam de dia em dia; ao sair do foco a dica some.
- **Largura:** `useElementWidth` mede a largura do card e o SVG é redesenhado nela, então o gráfico acompanha o tamanho da tela sem distorcer o texto.
- **Acessibilidade:** além do SVG (`role="img"`), cada gráfico tem uma tabela invisível (`.srOnly`) com um dia por linha, lida por leitores de tela. Os testes usam essa tabela para conferir os valores.

#### `BarChart({ title, items, color, formatValue })`

[components/charts/BarChart.jsx](src/features/admin/components/charts/BarChart.jsx)

Barras horizontais em HTML (lista `<ol>`). Cada item é `{ key, label, value, detail? }`.
- A maior barra ocupa a largura toda; as outras são proporcionais. O valor fica escrito na ponta de cada barra, então não precisa de dica.
- `detail` aparece em cinza embaixo do nome (o cargo, nas passagens).
- CSS: `.row` é a linha (nome à esquerda em 30%, barra à direita); `.track` reserva 128px à direita para o valor; `.bar` tem 16px de altura e a ponta arredondada.

#### `ShareBar({ title, items, formatValue })`

[components/charts/ShareBar.jsx](src/features/admin/components/charts/ShareBar.jsx)

Uma barra horizontal dividida em partes proporcionais (100%), com 2px entre as partes, e embaixo a legenda em lista: cor, nome, % e valor. Cada item é `{ key, label, value, share, color }`. Usada em "Participação por setor" e "Concentração".

#### `SalesCalendar({ weekdays, calendar, formatDetail })`

[components/charts/SalesCalendar.jsx](src/features/admin/components/charts/SalesCalendar.jsx)

Uma tabela HTML por mês, com o nome do mês na legenda (já acessível para leitor de tela, sem tabela escondida): cabeçalho com Seg a Dom e "Total", uma linha por semana e a linha de totais no rodapé. Os dias de outro mês que completam a primeira e a última semana ficam em branco; dias fora do período ficam apagados ("fora do período") e dias futuros pontilhados ("ainda não chegou"). Cada dia tem `aria-label` com o dia da semana, a data, a quantidade e o valor. A cor vem de `heatLevel(quantidade, máximo)`, de 0 a 5. Embaixo, a linha de detalhe (ao passar o mouse) e a escala "Menos vendas → Mais". Em telas estreitas a tabela rola para o lado.

#### `ShareBar` com item expansível

Quando um item tem `details` (lista de itens), a linha dele na legenda vira um botão com uma setinha (`aria-expanded`). Clicando, abre embaixo a lista recuada com cada item, sua porcentagem e valor. É o que o "Demais (8)" da **Concentração** usa: abre os vendedores do 4º em diante, cada um com a % do total.

#### `InsightWidgets`

[components/InsightWidgets/InsightWidgets.jsx](src/features/admin/components/InsightWidgets/InsightWidgets.jsx)

Os cards de análise: `SalesKpis`, `ForecastCard`, `WeeklySalesChart`, `TicketChart`, `SegmentShareChart`, `ConcentrationChart`, `CancellationChart` e `SalesCalendarChart`. Usam o `ChartCard` dos `SalesChartWidgets`.

#### `SalesChartWidgets`

[components/SalesChartWidgets/SalesChartWidgets.jsx](src/features/admin/components/SalesChartWidgets/SalesChartWidgets.jsx)

Os sete cards da aba, um componente para cada (`TotalSalesChart`, `SegmentSalesChart`, `GoalTrackChart`, `FunnelSalesChart`, `VendorSalesChart`, `TeamSalesChart`, `PassageChart`), todos recebendo `period` e `segment` (o `GoalTrackChart` ignora o período). `ChartCard({ title, description, csvRows, period, segment, children })` é a moldura comum: card, título, descrição em cinza, o botão "CSV" (quando `csvRows` tem dados além do cabeçalho) e o corpo. `csvRows` é uma lista de linhas (cada linha uma lista de células); o botão monta o arquivo com `tableToCsv` e baixa com `downloadFile`. Sem dados, cada card mostra um aviso ("Nenhuma venda no período", "Nenhuma passagem no período", "Nenhuma venda ainda").

#### `PeriodComparison({ segment })`

[components/PeriodComparison/PeriodComparison.jsx](src/features/admin/components/PeriodComparison/PeriodComparison.jsx)

O card "Comparar períodos". Guarda o atalho e os dois períodos no próprio estado (não depende do filtro de período da página). Usa `useSalesComparison(a, b, setor)` ([hooks/useSalesComparison.js](src/features/admin/hooks/useSalesComparison.js)), que lê o mesmo cache de `/sales/admin`: **não precisou de rota nova no backend**, porque o front já recebe todas as vendas. As contas ficam em [utils/comparison.js](src/features/admin/utils/comparison.js): `comparisonPresets(hoje)`, `summarizeRange(ativas, período)`, `cumulativeByDayIndex` (acumulado por dia do período, parando no fim dele e em hoje) e `buildComparison`. As funções de data (meses, nomes em português, `formatRange`) ficam em [utils/dateRange.js](src/features/admin/utils/dateRange.js). O CSV traz a tabela da comparação.

### Hooks dos gráficos

- [useSalesCharts(period, segment)](src/features/admin/hooks/useSalesCharts.js): `useSuspenseQuery(adminSalesQuery(""))` com um `select` que roda `buildSalesCharts`. Usa **o mesmo cache** da lista de vendas do Dashboard (chave `["admin-sales", "all"]`), então os sete gráficos fazem uma requisição só, e trocar de período ou setor não busca de novo: só recalcula.
- [useSalesInsights(period, segment)](src/features/admin/hooks/useSalesInsights.js): igual ao `useSalesCharts`, no mesmo cache, mas o `select` roda `buildSalesInsights` (indicadores, ticket, cancelamentos, calendário, participação, concentração e semanas).
- [useTeams()](src/features/admin/hooks/useTeams.js): busca as equipes com `getTeams`, chave `["admin-teams"]`.
- [useElementWidth(larguraInicial)](src/features/admin/hooks/useElementWidth.js): devolve `[ref, largura]`. Mede o elemento com `ResizeObserver` e atualiza quando ele muda de tamanho. Sem `ResizeObserver` (nos testes), fica na largura inicial.

### Utilitários dos gráficos

[utils/chartData.js](src/features/admin/utils/chartData.js), funções puras que transformam a lista de vendas nos dados de cada gráfico:

| Função | O que faz |
|---|---|
| `isActiveSale(venda)` | `true` para venda ativa com `realizedAt` |
| `segmentOf(venda)` / `funnelOf(venda)` | Segmento em maiúsculas (ou "Sem setor") / `"renewals"` para farm, `"sales"` para o resto |
| `listDays(vendas, semana, agora)` | Os dias do eixo, como descrito acima |
| `formatDay(dia)` | `"2026-10-05"` → `"05/10"` |
| `cumulativeByDay(vendas, dias)` | Soma do valor dia a dia, acumulando |
| `cumulativeByDayAndGroup(vendas, dias, chaveDe)` | Uma série acumulada por grupo (ex.: segmento), em ordem alfabética |
| `dailyByFunnel(vendas, dias)` | `{ sales, renewals }` com o valor de cada dia, sem acumular |
| `totalsByVendor(vendas)` | Total por vendedor, do maior para o menor (empate em ordem alfabética) |
| `totalsByTeam(vendas, equipes)` | Total por equipe; todas as equipes aparecem, mesmo com R$ 0; vendedor sem equipe conhecida vai para "Sem equipe" |
| `passagesByPerson(vendas)` | Quantidade de passagens por pessoa, com o cargo em `detail`. Aceita `sdrIds` e o `sdrId` antigo |
| `buildSalesCharts(vendas, semana, agora)` | Junta tudo: filtra as ativas, aplica a semana e devolve `{ days, activeSales, total, bySegment, byFunnel, byVendor, passages, campaign }`. `campaign` é o acumulado da campanha inteira, sem a semana, para o "Acumulado x meta" |

- [utils/chartScale.js](src/features/admin/utils/chartScale.js): `niceTicks(máximo)` devolve os valores do eixo (0, 25, 50, 75, 100…), sempre redondos (passos de 1, 2, 2,5 ou 5 vezes uma potência de 10); `formatCompactCurrency(valor)` escreve "R$ 200 mil", "R$ 2,5 mi" ou "R$ 1,2 bi" (até 1 casa decimal, sem ",0"). A abreviação é feita no código, e não com o `notation: "compact"` do `Intl`, porque o `Intl` muda de versão para versão do Node: no Node 22 do Cloudflare ele escrevia "R$ 3,0 mi" e no Node 24 "R$ 3 mi", e isso derrubou um deploy; `formatPassages(n)` escreve "1 passagem" ou "3 passagens".
- [utils/chartColors.js](src/features/admin/utils/chartColors.js): as cores das séries, como variáveis CSS com a cor clara de reserva (`var(--chart-blue, #2a78d6)`). Azul para a primeira (e para os gráficos de uma série só), laranja para a segunda, verde-água para um segmento desconhecido e cinza (`rest`) para "Demais". No escuro viram `#3987e5`, `#d95926` e `#199e70`. `segmentColor(segmento)` fixa B2B em azul e B2G em laranja, para a cor de cada segmento não mudar quando o filtro tira um deles. As cores foram conferidas para daltonismo e contraste, no fundo claro e no escuro. `heatLevel(quantidade, máximo)` dá o nível de 0 a 5 do calendário.
- `chartScale.js` também tem `formatPercent` ("43,4%"), `formatVariation` ("+5,1%", "-12,4%") e `formatSalesCount` ("1 venda", "2 vendas").
- `weeks.js` ganhou `daysBetween(dia1, dia2)` (dias entre duas datas "AAAA-MM-DD").

[utils/salesInsights.js](src/features/admin/utils/salesInsights.js), as contas das análises:

| Função | O que faz |
|---|---|
| `summarize(vendas)` | `{ total, count, average }` |
| `variation(atual, anterior)` | Variação em fração (0,05 = +5%); `null` quando o anterior é 0 |
| `buildKpis(ativas, semana)` | `{ current, previous }`: a semana e a anterior; sem semana, `previous` é `null` |
| `ticketBySegment` / `ticketByVendor` | Ticket médio por setor / por vendedor, do maior para o menor, com "N vendas" em `detail` |
| `cancellationSummary(vendas)` | `{ count, closed, rate, lostValue, byVendor }`; recebe as vendas de todos os status |
| `salesCalendar(ativas, { start, end }, hoje)` | `{ months, max }`: um item por mês tocado pelo período, com `weeks` (7 `cells` cada: `{ day, inMonth, inPeriod, future, count, value }`), `total` e `weekdayTotals` |
| `calendarRange(ativas, período, hoje)` | O período do calendário: o do filtro, ou da primeira venda até hoje |
| `segmentShare(ativas)` / `shareOf(itens)` | Valor e fração do total de cada segmento / de cada item |
| `concentration(ativas)` | `{ top, topShare, rest }`: os 3 maiores vendedores e o resto (`rest.items` traz cada um dos demais com a sua %) |
| `weeklyTotals(ativas, agora)` | `{ weeks, sales, renewals }` da primeira semana com venda até a atual, semanas vazias com 0 |
| `forecastTrack(campanha, forecast)` | As séries do "Acumulado x meta" a partir do forecast do backend: o vendido dia a dia até hoje, o **cenário realista** (`trajectory.realistic`; em domingo e feriado repete o último valor) e o **ritmo necessário** (do vendido de hoje até a meta, dividido igualmente pelos dias produtivos que faltam, terminando exatamente na meta). Sem linhas tracejadas depois do fim ou com a meta batida |
| `lastDaysTrend(ativas, hoje)` | Os últimos 7 dias (terminando hoje): total, quantidade e ticket por dia, para os mini gráficos dos indicadores |
| `buildSalesInsights(vendas, semana, agora)` | Junta tudo para o `useSalesInsights` |

[utils/tableCsv.js](src/features/admin/utils/tableCsv.js): `tableToCsv(linhas)` (mesmo formato do CSV de vendas: BOM, `;` e escape), `timeSeriesRows` e `barRows` (montam as linhas a partir dos dados dos gráficos), `formatCsvNumber` (vírgula decimal) e `buildChartFileName({ title, period, segment })` ("grafico-ticket-medio-b2b-semana-2026-10-19-2026-10-22.csv"). `toSlug` foi exportado do `salesCsv.js` para ser reaproveitado aqui.

---

## Novidades: tempo real, perfis, pontos e meta semanal

Feitas junto com mudanças no backend (ver `ROTAS.md` e `projeto.md` de lá: RN-60 a RN-63). Sem os parâmetros novos, as rotas antigas respondem igual, então as TVs não mudam.

- **Uma previsão só:** o "Acumulado x meta" e o "Forecast" usam `GET /analytics/forecast` (o card "Previsão de fechamento" saiu). Com setor, a meta é a do setor quando o backend tem.
- **Meta semanal automática** (`weekGoal` do forecast): card **Meta da semana** no Dashboard ([WeekGoalWidget](src/features/admin/components/WeekGoalWidget/WeekGoalWidget.jsx)), com vendido, meta, percentual, quanto falta, ritmo necessário por dia, cenário realista da semana e dias produtivos restantes. A meta é (meta − vendido antes da segunda) ÷ dias produtivos até 01/12 × dias produtivos da semana, e fica fixa durante a semana.
- **Tempo real no admin:** [SaleToasts](src/features/admin/components/SaleToasts/SaleToasts.jsx), montado no `AdminLayout`, escuta o mesmo `GET /sales/events` da TV (`useLiveSales`). A cada evento, atualiza todos os dados do admin (consultas com chave começando em `admin-`); venda nova também mostra um aviso no canto (foto, nome, cargo, passagem), que some em 8 s ou no X, no máximo 3 de cada vez. Sem provider de dados (testes soltos) ou sem `EventSource`, não escuta.
- **Fotos:** [Avatar](src/features/admin/components/Avatar/Avatar.jsx) mostra a `imageUrl` ou, sem foto (ou se ela não carrega), as iniciais. As iniciais vêm pelo CSS (`data-initials`), então não entram no texto lido por leitores de tela. Aparece nos rankings, em "Vendas por pessoa", "Passagens por pessoa", "Pontos por equipe", no aviso e no perfil.
- **Rankings com período e movimento:** [RankPeriodTabs](src/features/admin/components/RankPeriodTabs/RankPeriodTabs.jsx) troca entre **Campanha**, **Esta semana** e **Semana passada** (`?period=week` e as rotas `last-week`). Em "Esta semana", cada pessoa mostra o movimento em relação à semana passada (`withMovement`, [utils/rankMovement.js](src/features/admin/utils/rankMovement.js)): ▲ subiu, ▼ caiu, = igual, "novo". O ranking da campanha não tem movimento porque o backend não guarda como ele estava antes.
- **Pontos por equipe** e **Evolução dos pontos** (Gráficos › Pessoas e equipes): usam `GET /analytics/points-history`, com venda, renovação e passagem por dia; seguem o filtro de período e de setor ([utils/teamPoints.js](src/features/admin/utils/teamPoints.js)).
- **Pontos por pessoa** ([PeoplePoints](src/features/admin/components/PeoplePoints/PeoplePoints.jsx)): classificação de **todo mundo** (vendedores e pessoas de passagem), do maior para o menor, com posição, foto, nome, equipe e cargo, uma barra dividida em venda (azul), renovação (laranja) e passagem (verde) e o total. Passando o mouse em cada parte da barra aparece quantos pontos ela vale. Quem ainda não pontuou aparece no fim, com 0.
  - **Seletor de equipe** ("Todas as equipes" ou uma equipe): filtra a lista e as posições são recontadas dentro da equipe (1º da equipe, 2º...). A lista rola dentro do card (até 480 px de altura); no PDF sai inteira.
  - **No Dashboard** (`PeoplePointsWidget`, abaixo dos rankings, largura toda): abas **Campanha / Esta semana / Semana passada**, como os rankings, e segue o filtro de setor. A equipe escolhida continua ao trocar de aba.
  - **Nos Gráficos** (`PeoplePointsChart`, em Pessoas e equipes, largura toda): segue o filtro de período (mandado como `from`/`to`) e de setor, tem o botão CSV (posição, pessoa, equipe, cargo, venda, renovação, passagem e total, só da equipe escolhida) e entra na escolha do PDF.
  - Os pontos vêm prontos do backend (`GET /analytics/people-points`, [usePeoplePoints](src/features/admin/hooks/usePeoplePoints.js)), com a mesma tabela de pontos do placar das TVs, então somando as pessoas de uma equipe dá o total da equipe. O front só filtra pela equipe e numera ([utils/peoplePoints.js](src/features/admin/utils/peoplePoints.js)). Atualiza sozinho com as vendas ao vivo (a chave começa com `admin-`).
- **Perfil do vendedor:** clicar no nome em "Vendas por pessoa" ou no ranking de vendedores abre o painel lateral [VendorProfile](src/features/admin/components/VendorProfile/VendorProfile.jsx): foto, cargo, posição, esta semana x semana passada, sequência de dias seguidos com venda (🔥), total, vendas, ticket, vendas novas, renovações, canceladas, valor acumulado e as últimas 5 vendas. Fecha no X, com Esc ou clicando fora. Contas em [utils/vendorProfile.js](src/features/admin/utils/vendorProfile.js).
- **Seções na aba Gráficos:** Visão geral, Vendas, Pessoas e equipes e Análises, com um menu fixo no topo que rola até cada uma. O PDF continua com a mesma escolha de widgets (o menu não sai na impressão).
- **Acabamento:**
  - mini gráfico dos últimos 7 dias nos indicadores ([Sparkline](src/features/admin/components/charts/Sparkline.jsx));
  - os valores dos indicadores entram com uma animação curta quando mudam (o número em si não "conta", para o texto continuar sempre certo);
  - a barra da meta tem marcas em 25%, 50% e 75% e uma marca de **onde deveria estar hoje** (dias produtivos que passaram ÷ total, vindo do forecast). Essa marca tem o próprio `ErrorBoundary` com `fallback={null}`: se o forecast falhar, a barra continua normal;
  - quando o percentual cruza 25%, 50%, 75% ou 100% com a página aberta (por exemplo, por uma venda ao vivo), aparece "🎉 50% da meta alcançados!" por 6 s. Ao abrir a página não comemora;
  - as animações respeitam o "reduzir movimento" do sistema.
- **Mudanças pequenas em arquivos que já existiam:**
  - o `ErrorBoundary` aceita `fallback` (só muda algo quando passado);
  - o `renderWithQuery` dos testes também devolve o `queryClient`;
  - o backend falso (`src/shared/mocks`) aceita `segment` nos rankings, tem `points-history`, `people-points` e a meta semanal no forecast. Ele continua com a pontuação simplificada.

## Minha área (vendedores e pessoas de passagem)

Tela `/minha-area` ([PersonPage](src/features/person/pages/PersonPage.jsx)), para os perfis `vendor` e `sdr`. Usa o mesmo `AdminLayout` (menu lateral e modo escuro), mas o menu mostra só **Minha área**. Depois do login, o colaborador cai no `/admin` e é mandado para `/minha-area`.

- **Cabeçalho:** "Olá, nome" e "cargo · time" (`GET /me`).
- **Resumo:** total vendido (só concluídas), vendas concluídas, ticket médio e canceladas, contados em cima das vendas da pessoa ([utils/mySales.js](src/features/person/utils/mySales.js)).
- **Meus pontos e prêmios:** dois cards logo abaixo do resumo: **Meus pontos** (todos os pontos acumulados até agora, inclusive a semana em andamento, de todos os setores) e **Prêmios retirados** (soma das retiradas registradas pelo master). Vêm de `GET /me/prizes`, com o mesmo cálculo da tela de Prêmios, então batem com a coluna "Acumulado" e "Retirados" de lá.
- **Ranking dos times:** os três times com posição, camiseta e pontos, com o time da pessoa destacado ("(seu time)") e a frase "Seu time está em 2º lugar, com 14 pontos". Abas Campanha / Esta semana / Semana passada (`GET /me/team?period=`).
- **Pontos do meu time:** os colegas do time em classificação, com a barra de venda/renovação/passagem e o total (o mesmo `PeopleList` do widget "Pontos por pessoa"). A própria pessoa fica destacada, com "Você" embaixo do nome. Segue as mesmas abas do ranking. **Só pontos**: o backend não manda nenhum valor de venda dos colegas.
- **Minhas vendas** (vendedor) ou **Vendas com a minha passagem** (passagem): a mesma lista do Dashboard (`SaleList`, separada do `SaleWidget` sem mudar nada nele), da mais nova para a mais antiga (`GET /me/sales`).
- As consultas ([hooks/useMe.js](src/features/person/hooks/useMe.js), [api/meApi.js](src/features/person/api/meApi.js)) têm chave começando em `admin-`, então atualizam sozinhas com as vendas ao vivo.
- **A segurança é do backend:** a pessoa vem do token, nunca da URL, e todas as rotas do admin respondem 403 para esses perfis.
- Os mocks respondem `/me`, `/me/sales`, `/me/team` e `/me/prizes` como se a Brenda Lima estivesse logada.

**Tela Usuários:** o cadastro ganhou os perfis **Vendedor** e **Passagem**. Com eles aparece o campo **Pessoa** (lista de `/vendor/list` ou `/sdr/list`), obrigatório; o front manda `vendorId` ou `sdrId`. Na lista, a conta de colaborador mostra "Vendedor · Brenda Lima" e não troca de perfil pela tela (só senha e excluir), porque trocar o perfil exigiria escolher outra pessoa.

**Contas criadas pelo seed do backend** (`node seed.js --contas`, rodado à mão uma vez; não roda no deploy): uma para cada vendedor e pessoa de passagem do `seed.js`, com e-mail `nome.sobrenome@orcafascio.com` e senha `Nome123` (primeiro nome com inicial maiúscula, sem acento; ex.: `vinicius.pereira@orcafascio.com` / `Vinicius123`). O seed só cria o que falta: nunca troca senha nem perfil de quem já tem conta.

## Sair e trocar a própria senha

No pé do menu lateral ficam, nessa ordem: **Trocar senha**, **Modo escuro** e **Sair**. Valem para todos os perfis, inclusive na Minha área. Sem usuário logado (ex.: teste de componente solto, fora do `AuthContext`), só o Modo escuro aparece, como antes.

- **Sair** chama o `logout()` do `AuthContext`: `POST /auth/logout` invalida o refresh token e apaga o cookie no backend, o front limpa a sessão e o cache, e o `PrivateRoute` manda para o login. Antes essa rota não existia no backend, então recarregar a página entrava de novo pelo cookie.
- **Trocar senha** abre o [ChangePasswordDialog](src/features/auth/components/ChangePasswordDialog/ChangePasswordDialog.jsx): senha atual, senha nova e confirmação. Ele confere no front (mínimo 6 caracteres, confirmação igual) e chama `POST /auth/change-password` (`changePassword` em [authApi.js](src/features/auth/api/authApi.js)). Senha atual errada mostra "Senha atual incorreta". Deu certo: mostra "Senha alterada", e o front guarda o usuário e o token novos (`SET_USER`), então a pessoa continua logada aqui. Nos outros aparelhos, as sessões caem. Fecha em Cancelar, Esc ou clicando fora.
- Só troca a senha de quem está logado: o backend pega o usuário pelo token. Trocar a senha de outra pessoa continua sendo na tela Usuários (só o master).

## 8. Testes

| Arquivo | Garante |
|---|---|
| `api/slidesApi.test.js` | Sem vendedor busca `/sales/admin`; com vendedor busca `/sales/get/:vendorId`; devolve da mais nova para a mais antiga com o total; busca os vendedores em `/vendor/list`; o ranking manda o tipo e devolve a lista de dentro de `vendor` |
| `utils/salesCsv.test.js` | Começa com BOM e usa `;`; cabeçalho e uma linha por venda com status, valor, tipo, segmento, vendedor, passagem, data e ID traduzidos; passagem vazia sem SDR; várias pessoas da passagem na mesma célula, separadas por vírgula; escapa aspas, `;` e quebras de linha; nome do arquivo com o vendedor ou "todos", sem acento, e com a semana quando filtrada |
| `utils/passages.test.js` | Lista e nomes das pessoas da passagem; lista vazia sem passagem; ignora pessoa não populada; aceita venda antiga com `sdrId` |
| `utils/weeks.test.js` | Semana pela segunda-feira de São Paulo; domingo 23:59 e segunda 00:00 nos limites certos; semana anterior na virada do mês; intervalo de segunda a segunda; nomes "Semana atual" e "Semana passada"; semana do dia 1º do mês (inclusive na virada do mês em São Paulo); todas as semanas do mês mesmo sem vendas; começo do mês; volta mais com venda antes do mês; filtro sem semana devolve tudo; filtro respeita os limites |
| `components/RankWidget/RankWidget.test.jsx` | Abre na aba Vendas com posição, nome, cargo e pontos ("1 ponto" no singular); a aba Renovação busca e mostra o ranking de farm; avisa quando ninguém pontuou; com um setor, monta o ranking pelas vendas do setor sem chamar o backend |
| `utils/chartData.test.js` | Dias do eixo sem semana, com semana atual (até hoje) e semana passada (7 dias); sem vendas não tem dias; dia pelo horário de São Paulo; acumulado com dias sem venda; séries por segmento em ordem alfabética com "Sem setor"; vendas x renovações por dia sem acumular; totais por vendedor do maior para o menor; totais por equipe com todas as equipes e "Sem equipe"; passagens por pessoa com cargo e `sdrId` antigo; canceladas fora e semana aplicada, mas a campanha com todas; formato do dia |
| `utils/chartScale.test.js` | Escala começa em 0 e termina num número redondo acima do máximo; escala mínima sem valor; reais compactos; percentual e variação com sinal; "passagem" e "venda" no singular |
| `utils/salesInsights.test.js` | Variação; indicadores da semana e da anterior; ticket médio por setor e pessoa; cancelamentos com taxa, valor e pessoa; calendário com o mês inteiro, dias fora do período e futuros, e meses entre a primeira venda e hoje; concentração com a lista dos demais; participação somando 100%; concentração dos 3 maiores; semanas vazias com 0; previsão e ritmo necessário; nada projetado depois do fim; linhas tracejadas começando em hoje; sem ritmo necessário com a meta batida |
| `utils/tableCsv.test.js` | Número com vírgula; BOM, `;` e escape; linhas dos gráficos de dia e de barras; nome do arquivo sem acento, com o setor e a semana |
| `utils/periods.test.js` | Todo o período não filtra; últimos N dias terminam hoje; este mês desde o dia 1º; semana de segunda a domingo; período específico com datas invertidas e sem fim; filtro pelo dia de São Paulo nos limites; período anterior do mesmo tamanho; nome da comparação e do arquivo |
| `utils/comparison.test.js` | Atalhos a partir de uma quarta (dia, semana, 7 dias, mês, sem passar do fim do mês); resumo do período; acumulado por dia parando no fim e em hoje; canceladas fora e tamanho do maior período |
| `utils/dateRange.test.js` | Dias de cada mês (inclusive fevereiro de ano bissexto), virada de ano, meses entre duas datas; nomes em português |
| `utils/companyLink.test.js` | Link com https, http e sem protocolo; nome comum continua texto; recusa `javascript:`, `mailto:`, `data:` e endereço sem domínio |
| `utils/vendorProfile.test.js` | Sequência de dias vendendo; perfil com totais, posição, semanas, evolução e últimas vendas; vendedor sem vendas |
| `utils/teamPoints.test.js` | Pontos por equipe somados por tipo e por período; evolução acumulada |
| `pages/AdminLayoutAccount.test.jsx` | Logado: Trocar senha, Modo escuro e Sair no pé do menu; Sair chama o logout; Trocar senha abre e fecha o diálogo; sem login, só o Modo escuro |
| `auth/components/ChangePasswordDialog/ChangePasswordDialog.test.jsx` | Troca a senha e devolve usuário e token novos; senha curta ou diferente não chama o backend; mostra o erro do backend; Cancelar, Esc e clicar fora fecham |
| `app/GoalsRoutes.test.jsx` | Master, admin e usuário antigo abrem as duas telas de metas e veem os itens no menu; as telas têm endereços separados; b2b/b2g não veem os itens e voltam para o Dashboard; vendedor e passagem vão para a própria área |
| `goals/utils/goalDraft.test.js` | Semanas do mês; partes do setor e faixas; faixa atual subindo de Meta para Super e Black com o excedente; ritmo; divisão pelos pesos e pelas semanas fechando no centavo; ajuste à mão redistribuindo o resto; salvar travado quando semana ou parte não fecha e com Super/Black inválidas; quem fica sem meta; mês salvo voltando igual; mês novo copiando o anterior |
| `goals/components/GoalTierCard/GoalTierCard.test.jsx` | Mostra só a faixa atual: Meta, depois Super com a Meta marcada como batida, e a Black com o excedente |
| `goals/pages/GoalsPages.mocks.test.jsx` | Com os dados falsos: resumo, setores, barras por vendedor, filtro de setor, detalhe do vendedor e mês sem metas; cadastro abrindo o mês salvo com tudo fechando, semana errada travando o salvar e "Redistribuir" resolvendo, meta do setor redistribuindo, aviso de demonstração ao salvar e mês novo em branco |
| `app/PersonRoutes.test.jsx` | Vendedor e passagem abrindo o admin vão para a própria área, com só "Minha área" no menu; master, admin, b2b, b2g e usuário antigo continuam no admin e não entram na área do colaborador |
| `person/pages/PersonPage.mocks.test.jsx` | Com os dados falsos: nome, cargo e time; só as vendas da pessoa com o resumo; ranking dos times com o time destacado e os pontos dos colegas, sem valores em reais; as abas trocam o período |
| `utils/peoplePoints.test.js` | Ordem do backend com posições; filtro por equipe recontando as posições; equipe vazia; linhas do CSV com a divisão dos pontos |
| `components/PeoplePoints/PeoplePoints.test.jsx` | Dashboard: lista com equipe, cargo, divisão e total; seletor de equipe; abas de período mantendo a equipe e mandando o setor; Gráficos: período da página como `from`/`to` e CSV só da equipe escolhida; aviso de equipe sem ninguém |
| `components/SaleToasts/SaleToasts.test.jsx` | Aviso de venda nova e de renovação, atualiza só os dados do admin, venda alterada sem aviso, fecha no X e sozinho, no máximo 3, para de escutar ao sair |
| `components/Avatar/Avatar.test.jsx` | Foto; iniciais quando não há foto ou ela não carrega |
| `components/WeekGoalWidget/WeekGoalWidget.test.jsx` | Meta da semana com percentual, falta, ritmo e cenário; setor; meta batida; sem meta fora da campanha |
| `pages/ChartsPage.test.jsx` | Sem vendas, cada gráfico mostra o aviso; se as equipes não carregam, só o gráfico de equipes some; as setas do teclado mostram o dia e o valor na dica, e ela some ao sair do foco; o botão CSV baixa os dados certos; não tem mais botão próprio de modo escuro; a previsão mostra os dias restantes e o ritmo necessário ; Gerar PDF lista os 15 itens com todos marcados, "Selecionar todos" desmarca tudo e desativa o botão, escolher alguns deixa "meio marcado", imprime só os escolhidos com o cabeçalho e volta ao normal no `afterprint`; Cancelar e Esc fecham sem imprimir; todos marcados imprime tudo |
| `pages/ChartsPage.mocks.test.jsx` | Com os dados falsos: os indicadores e os catorze gráficos na ordem; previsão (R$ 589.913,04 projetados, R$ 68.000,00 por dia em 41 dias); vendas por semana; ticket médio por setor; participação B2B 43,4% / B2G 56,6%; concentração de 64,9% nos 3 maiores; cancelamentos 11,1% (2 de 18, R$ 27.000,00); calendário com setembro e outubro inteiros (dias futuros "ainda não chegou", totais por dia da semana); comparar períodos (esta semana x semana passada, atalho de quarta x quarta e escolha pelo calendário); "Demais (8)" abre a lista do 4º ao 11º com a %; com os últimos 7 dias, 7 dias no eixo e comparação "vs período anterior"; com a semana atual, indicadores com variação (+5,1%, +20%, -12,4%) e cancelamentos de 14,3%; acumulado e acumulado x meta chegam em R$ 212 mil (sem as canceladas) com a meta de R$ 3 mi; B2B R$ 92 mil e B2G R$ 120 mil; vendas por pessoa, por equipe e passagens da campanha; filtrando a semana atual, os valores mudam (R$ 82 mil) e o acumulado x meta continua na campanha inteira; com o setor B2B, tudo mostra só B2B (R$ 92 mil, participação 100%, 3,1% da meta) |
| `components/GoalWidget/GoalWidget.test.jsx` | Mostra o vendido, a meta, o percentual e quanto falta, com a barra na largura do percentual; acima da meta a barra fica em 100%, o percentual real aparece e mostra "Meta batida!"; lista vendas, passagens e renovações por setor, sem as canceladas; avisa em cada coluna quando não tem nada |
| `utils/sectorCounts.test.js` | Vendas e renovações por segmento em ordem alfabética; uma passagem por pessoa, pelo cargo, em vendas e renovações; ignora canceladas; aceita `sdrId` antigo e agrupa sem segmento ou cargo em "Sem setor" |
| `components/SdrRankWidget/SdrRankWidget.test.jsx` | Mostra o ranking de passagens vindo do backend; avisa quando ninguém fez passagem; com um setor, conta só as passagens das vendas do setor |
| `pages/AdminLayout.test.jsx` | Menu com Dashboard e Erros, abrindo no dashboard marcado; clicar em Erros troca a página sem recarregar e muda o item marcado; abrir direto em `/admin/erros` marca só Erros; clicar em Gráficos abre a aba e marca só ela; modo escuro: o botão fica no menu lateral, começa no claro e liga/desliga o tema do admin inteiro, a escolha fica salva e volta ao abrir de novo, aproveita a escolha do antigo botão dos Gráficos e, sem o provider, fica no claro sem quebrar |
| `pages/ErrorsPage.test.jsx` | Título "Erros" e os widgets de logs de erro e de teste |
| `pages/AdminPanel.test.jsx` | Opções de vendedor em ordem alfabética e de semana com todas as semanas do mês; filtra por uma semana de duas semanas atrás; vendedor sem nome aparece como "Vendedor sem nome" sem esvaziar a lista; avisa quando os vendedores não carregam; sem filtros lista e exporta tudo; só vendedor; só semana; semana + vendedor; semana sem vendas do vendedor mostra lista vazia; voltar para "Todas" e "Todos" mostra e exporta tudo; avisa quando a exportação falha e não baixa nada; setor começa em "Todos" e, com B2G, mostra e exporta só B2G; nome da venda com link vira link em nova aba e nome comum continua texto; últimos 3 dias e período específico (escolhido clicando duas vezes no calendário) filtram a lista e a exportação. Em cada caso confere a lista na tela, o conteúdo do CSV e o nome do arquivo |

Os testes do `AdminPanel` fixam a data em 22/10/2026 (`vi.setSystemTime`), para "Semana atual" e "Semana passada" não dependerem do dia em que rodam.

Os testes foram conferidos quebrando o código de propósito: com a exportação ignorando o vendedor, o teste "só o vendedor" falhou; com a exportação ignorando a semana, os testes "só a semana" e "semana + vendedor" falharam. Nos gráficos, contando as vendas canceladas, 4 testes falharam; ignorando o filtro de semana, 2 testes falharam.
