# Erros e logs

Como o front trata erros, onde eles aparecem, como são registrados e como o admin mostra os logs de erro e de teste.

O código não tem comentários de propósito. Toda explicação fica neste documento.

---

## 1. Visão geral

Quando algo quebra, três coisas acontecem:

1. **A tela mostra o erro.** No lugar do conteúdo aparece "Ops, algo deu errado", com a mensagem do erro, o **local** (qual tela, rota ou widget), o **componente** onde quebrou e o stack completo.
2. **O erro é registrado.** O log vai para o backend (`POST /logs`), com página, navegador e horário.
3. **O admin mostra o log.** O widget "Logs de erro" lista os erros de todas as TVs e navegadores.

```
erro de render (ex.: useSuspenseQuery lançou)
  └── ErrorBoundary mais próximo
        ├── ErrorScreen: "Ops, algo deu errado" + mensagem + local + componente + stack
        └── reportError → POST /logs ──(falhou)──► localStorage

erro numa rota (loader, render fora de um ErrorBoundary, 404)
  └── errorElement da rota → RouteErrorScreen → ErrorScreen + reportError

erro fora do React (evento solto, promise sem catch)
  └── installGlobalErrorHandlers → reportError

admin
  ├── ErrorLogWidget ← GET /logs
  └── TestReportWidget ← /test-report.json (gerado pelo npm test)
```

---

## 2. Arquivos

```
src/
├── main.jsx                                   chama installGlobalErrorHandlers()
├── app/
│   ├── Router.jsx                             errorElement em todas as rotas
│   └── RouteErrorScreen.jsx                   tela de erro das rotas
├── shared/
│   ├── errorLogger.js                         monta, envia e guarda os logs
│   ├── utils/isMockEnabled.js
│   └── components/
│       ├── ErrorBoundary/ErrorBoundary.jsx    captura erros de render de um trecho da tela
│       └── ErrorScreen/ErrorScreen.jsx        a tela "Ops, algo deu errado"
└── features/admin/
    ├── api/logsApi.js                         lê os logs de erro e o relatório de testes
    ├── hooks/useErrorLogs.js
    ├── hooks/useTestReport.js
    ├── utils/formatDateTime.js
    └── components/
        ├── ErrorLogWidget/                    lista de logs de erro
        └── TestReportWidget/                  resultado do último npm test
```

**Por que fica em `shared/`:** o tratamento de erros é usado pelo dashboard, pelo admin e pelas rotas. Pela regra do [GUIA_FEATURES.md](GUIA_FEATURES.md), o que é usado por várias features vai para `shared/`, e uma feature não importa de outra. A **leitura** dos logs só o admin faz, então fica em `features/admin/`.

---

## 3. O "middleware" de erros

No React, o papel de um middleware de erros é feito por um **Error Boundary**: um componente que envolve um trecho da tela e, se algo dentro dele quebrar, mostra uma tela de erro no lugar daquele trecho, sem derrubar o resto do app.

### `ErrorBoundary({ location, className, children })`

[src/shared/components/ErrorBoundary/ErrorBoundary.jsx](src/shared/components/ErrorBoundary/ErrorBoundary.jsx)

| Prop | Para que serve |
|---|---|
| `location` | Nome do lugar, mostrado na tela de erro e gravado no log. Ex.: `Dashboard › tela "goal"`, `Admin › logs de erro` |
| `className` | Classe extra para a tela de erro, para posicioná-la quando o trecho envolvido fica sobre outros elementos |
| `children` | O trecho protegido |

É composto por duas partes:

**`ErrorCatcher`** (classe): o React só permite capturar erros de render em componentes de classe.
- `getDerivedStateFromError(error)`: quando um filho quebra, guarda o erro no estado e passa a renderizar a tela de erro.
- `componentDidCatch(error, info)`: guarda o `componentStack`, a lista de componentes do ponto do erro até o boundary, e chama `reportError` com o local e esse stack.
- `retry()`: chama `onReset` e limpa o estado, renderizando o conteúdo de novo. É o botão "Tentar novamente".

**`ErrorBoundary`** (função): envolve o `ErrorCatcher` e passa como `onReset` o `reset` do `useQueryErrorResetBoundary`, do React Query.

**Por que o `useQueryErrorResetBoundary`:** quando uma query do `useSuspenseQuery` falha, o erro fica guardado no cache. Se a tela só renderizasse de novo, a query lançaria o mesmo erro na hora. O `reset` limpa esse erro e faz a query buscar de novo ao clicar em "Tentar novamente".

### `ErrorScreen({ error, location, componentStack, onRetry, className })`

[src/shared/components/ErrorScreen/ErrorScreen.jsx](src/shared/components/ErrorScreen/ErrorScreen.jsx)

A tela de erro:

| Parte | Conteúdo |
|---|---|
| Título | "Ops, algo deu errado" |
| Mensagem | `error.message` em vermelho. Se o erro não for um `Error`, é convertido para texto |
| Local | O `location` do boundary ou da rota |
| Componente | A primeira linha do `componentStack`, ou seja, o componente onde o erro aconteceu (ex.: `at TeamPodium`) |
| Stack | O stack do erro (arquivo e linha) e, abaixo de "Componentes:", a pilha de componentes completa |
| Botão | "Tentar novamente", quando `onRetry` existe |

- `firstLine(text)` pega a primeira linha não vazia de um texto. É usada para tirar o componente do `componentStack`.
- `role="alert"` faz leitores de tela anunciarem o erro.
- O CSS usa tamanhos fixos e `overflow: auto`, para a tela funcionar tanto ocupando uma TV inteira quanto dentro de um widget pequeno do admin.

### `RouteErrorScreen()`

[src/app/RouteErrorScreen.jsx](src/app/RouteErrorScreen.jsx)

É o `errorElement` de todas as rotas no [Router.jsx](src/app/Router.jsx). Pega erros que acontecem fora de qualquer `ErrorBoundary`, como no `PrivateRoute`, no `PublicRoute` ou numa página inteira.
- `useRouteError()` dá o erro e `useLocation()` dá a rota, que vira o local: `Rota /admin`.
- `isRouteErrorResponse` identifica respostas do próprio router, como **404** de uma rota que não existe. Elas viram `Error("404 Not Found")` para a tela, mas **não são registradas** como log, porque um endereço digitado errado não é um bug.
- "Tentar novamente" recarrega a página.

### Onde os boundaries estão

| Local | `location` | O que acontece num erro |
|---|---|---|
| Cada tela do carrossel | `Dashboard › tela "<id>"` | Só aquela tela vira a tela de erro; o carrossel segue |
| Popup de venda | `Dashboard › popup de venda` | A tela de erro cobre o dashboard (`.popupError`, `z-index: 3`) |
| Cada widget do admin | `Admin › vendas cadastradas`, `Admin › rank dos vendedores`, `Admin › logs de erro`, `Admin › logs de teste` | Só aquele widget vira a tela de erro |
| Cada rota | `Rota <caminho>` | A página inteira vira a tela de erro |

**Por que um boundary por tela, e não um só no app:** com um boundary único, uma falha no ranking de assistências apagaria a TV inteira. Com um por tela, só a tela com problema mostra o erro, e o local na tela já diz qual foi.

**Por que o pedido "resolver o erro do useSuspenseQuery" vira isso:** o `useSuspenseQuery` não devolve `isError`. Quando a requisição falha, ele **lança** o erro, que sobe até o boundary mais próximo. Antes não havia nenhum, e a tela ficava branca.

---

## 4. Registro dos erros

[src/shared/errorLogger.js](src/shared/errorLogger.js)

### Formato de um log

```json
{
  "level": "error",
  "message": "Request failed with status code 500",
  "stack": "AxiosError: Request failed...\n    at getScoreboard (dashboardApi.js:27)",
  "componentStack": "at TeamPodium\n    at Suspense\n    at RankingLayout ...",
  "location": "Dashboard › tela \"team-ranking-week\"",
  "url": "http://192.168.1.50:5173/",
  "userAgent": "Mozilla/5.0 ...",
  "occurredAt": "2026-10-22T15:00:00.000Z"
}
```

`url` e `userAgent` mostram de qual TV ou navegador veio o erro.

### Funções

| Função | O que faz |
|---|---|
| `buildErrorLog(error, { location, componentStack })` | Monta o log acima. Aceita qualquer valor lançado, não só `Error`. Sem `location`, usa "Desconhecido" |
| `reportError(error, context)` | Mostra o erro no console, monta o log e envia com `POST /logs`. Se o envio falhar, guarda no navegador. Com mocks ligados, guarda direto no navegador. **Nunca lança erro**, para o registro de um erro não causar outro |
| `getLocalErrorLogs()` | Lê os logs guardados no navegador (`localStorage`, chave `error-logs`), do mais novo para o mais antigo |
| `saveLocalErrorLog(log)` | Interna. Guarda o log no início da lista, com um `_id` gerado, e mantém só os 100 mais recentes |
| `installGlobalErrorHandlers()` | Escuta `error` (erro solto em qualquer código) e `unhandledrejection` (promise rejeitada sem `catch`) no `window` e manda os dois para `reportError`. Devolve a função que remove os listeners. É chamada uma vez no `main.jsx` |

**Por que existe o `localStorage` como reserva:** se o backend estiver fora do ar, que é justamente quando mais erros acontecem, o log não se perde. Ele fica no navegador onde aconteceu. Com `VITE_USE_MOCKS=true`, os logs ficam só no navegador, e o admin aberto no mesmo navegador mostra esses logs.

### Locais registrados pelos handlers globais

| Origem | `location` |
|---|---|
| Erro solto | `Global (<arquivo>:<linha>)` |
| Promise sem tratamento | `Promise sem tratamento` |

---

## 5. Contrato das rotas de log no backend

O front já envia e lê os logs nestas rotas. Elas precisam ser criadas no backend.

### `POST /logs`, pública

As TVs não fazem login, então a rota precisa ser pública.

**Body:** o log do item 4 (`level`, `message`, `stack`, `componentStack`, `location`, `url`, `userAgent`, `occurredAt`). `stack` e `componentStack` podem ser `null`.

**Resposta:** `201`. O front não lê o corpo.

Recomendações:
- limitar o tamanho do body (stacks podem ser longos) e a quantidade de requisições por IP, já que a rota é pública;
- guardar a data de recebimento além do `occurredAt`, que vem do relógio da TV.

### `GET /logs`, privada (JWT)

**Resposta:** no envelope padrão, com a lista do mais novo para o mais antigo. Cada log precisa ter `_id`.

```json
{ "success": true, "data": [ { "_id": "...", "message": "...", "location": "...", "occurredAt": "...", "...": "..." } ] }
```

As duas rotas já existem no backend (`features/logs`), com limite de requisições por IP no `POST`. Se o `POST` falhar (backend fora do ar, por exemplo), o log fica no `localStorage` da TV.

---

## 6. Admin

Os dois widgets ficam na aba **Erros** do admin ([ErrorsPage.jsx](src/features/admin/pages/ErrorsPage.jsx), rota `/admin/erros`), lado a lado. Todos os widgets do admin ficam dentro de um `ErrorBoundary`. O layout do admin está em [ADMIN.md](ADMIN.md).

### Logs de erro

| Arquivo | O que faz |
|---|---|
| `api/logsApi.js` → `getErrorLogs()` | Com mocks, devolve `getLocalErrorLogs()`. Sem mocks, busca `GET /logs` e devolve `data` |
| `hooks/useErrorLogs.js` → `useErrorLogs()` | `useSuspenseQuery` com chave `["error-logs"]`, buscando de novo a cada 30s. Devolve `{ logs }` |
| `components/ErrorLogWidget/` | Cabeçalho "Logs de erro" com a contagem (verde com zero, vermelha com algum erro). Cada log mostra local, data e hora, mensagem, página e um "Stack" que abre o stack completo. Sem logs, mostra "Nenhum erro registrado" |
| `utils/formatDateTime.js` → `formatDateTime(valor)` | Formata data e hora no padrão brasileiro: `22/10/2026, 12:00:00` |

### Logs de teste

O `npm test` agora gera, além do resultado no terminal, o arquivo **`public/test-report.json`**:

```json
"test": "vitest run --reporter=default --reporter=json --outputFile.json=public/test-report.json"
```

- `--reporter=default` mantém a saída normal no terminal.
- `--reporter=json --outputFile.json=...` grava o relatório em JSON. Como fica em `public/`, o front serve o arquivo em `/test-report.json`.
- O arquivo está no `.gitignore`: ele muda a cada execução e não deve ir para o repositório.
- No `npm run build`, o arquivo que existir em `public/` vai junto para o `dist/`. Rode `npm test` antes do build para o admin de produção mostrar o resultado mais recente.

| Arquivo | O que faz |
|---|---|
| `api/logsApi.js` → `getTestReport()` | Busca `/test-report.json` sem cache. Se o arquivo não existir (o servidor devolve HTML ou erro), devolve `null` |
| `api/logsApi.js` → `toTestReport(report)` | Resume o relatório do Vitest: `success`, `total`, `passed`, `failed`, `skipped` (pendentes + todo), `ranAt` e `files`, com cada arquivo, status e testes (nome, status, duração e mensagens de falha). O caminho do arquivo fica a partir de `src/` |
| `api/logsApi.js` → `toRelativePath(path)` | Interna. Corta o caminho absoluto até `src/` |
| `hooks/useTestReport.js` → `useTestReport()` | `useSuspenseQuery` com chave `["test-report"]`. Devolve `{ report }` |
| `components/TestReportWidget/` | Cabeçalho "Logs de teste" com `passados/total` (verde se tudo passou, vermelho se algo falhou). Mostra quando rodou e quantos passaram, falharam e foram pulados. Cada arquivo de teste vira um bloco que abre e fecha, e os que falharam já vêm abertos, com a mensagem de falha de cada teste. Sem relatório, mostra "Nenhum relatório encontrado. Rode npm test para gerar." |

---

## 7. Testes

| Arquivo | Garante |
|---|---|
| `shared/errorLogger.test.js` | O log tem mensagem, stack, local, componente, página e horário; aceita valores que não são `Error`; envia para `POST /logs`; guarda no navegador se o backend falhar; com mocks guarda só no navegador, do mais novo para o mais antigo; os handlers globais registram erro solto e promise sem tratamento |
| `shared/components/ErrorBoundary/ErrorBoundary.test.jsx` | Sem erro mostra o conteúdo; com erro mostra título, mensagem, local e componente; registra o erro com local e pilha de componentes; "Tentar novamente" renderiza o conteúdo de novo; aplica a classe extra |
| `app/RouteErrorScreen.test.jsx` | Erro numa rota mostra a tela com `Rota /caminho` e registra o log; rota inexistente mostra 404 sem registrar |
| `features/admin/api/logsApi.test.js` | Busca os logs no backend; com mocks lê do navegador; resume o relatório do Vitest; lê o JSON; devolve `null` quando o relatório não existe |
| `features/admin/components/ErrorLogWidget/ErrorLogWidget.test.jsx` | Lista local, mensagem, página, stack e contagem; avisa quando não há erro |
| `features/admin/components/TestReportWidget/TestReportWidget.test.jsx` | Mostra resumo, arquivos e testes com a mensagem de falha; explica como gerar o relatório quando ele não existe |
| `features/dashboard/pages/DashboardPage.test.jsx` | Erro numa tela do carrossel mostra a tela de erro só nela e registra o log com o local certo |

Os testes que provocam erro silenciam o `console.error` durante o teste, porque o React sempre imprime os erros que um boundary captura.

---

## 8. Como testar na mão

1. **Tela de erro numa TV:** com o backend desligado e `VITE_USE_MOCKS=false`, abra `/`. Cada tela mostra "Ops, algo deu errado" com `Network Error` e o local da tela.
2. **Logs no admin:** provoque um erro (por exemplo, rode no console do navegador `Promise.reject(new Error("teste"))`) e abra `/admin/erros`. O erro aparece em "Logs de erro".
3. **Logs de teste:** rode `npm test` e abra `/admin/erros`. O widget "Logs de teste" mostra o resultado.
