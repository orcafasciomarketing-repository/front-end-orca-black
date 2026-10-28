# Front-end Black Friday

Front-end da campanha **Orça Black**. São duas partes:

- **Dashboard das TVs** (`/`): página pública que roda em loop nas TVs com a meta de faturamento e os rankings de equipes, artilheiros e assistências. Atualiza em tempo real a cada venda e mostra um popup em tela cheia para cada venda nova.
- **Painel admin** (`/admin`): área com login para acompanhar as vendas (com filtros por semana e por vendedor e exportação em CSV), os logs de erro das TVs e o resultado dos testes.

Os dados vêm do backend [`back-end-black-friday`](../back-end-black-friday), publicado no Render em `https://back-end-orca-black.onrender.com`. As vendas entram por uma planilha (Apps Script) e o front só lê. O front é publicado no Cloudflare Pages: ver [DEPLOY.md](DEPLOY.md).

---

## Stack

| Tecnologia | Uso |
|---|---|
| React 19 + Vite 8 | Interface e build |
| React Router 8 | Rotas e proteção de rotas |
| TanStack Query 5 | Busca, cache e atualização dos dados do servidor |
| Axios | Cliente HTTP, com interceptors de token e refresh |
| CSS Modules | Estilos isolados por componente |
| Vitest + Testing Library | Testes |
| oxlint | Lint |

---

## Requisitos

- **Node.js 22.12 ou mais novo** (exigência do Vitest; o Vite aceita a partir do 20.19)
- Backend rodando e com a origem do front liberada no CORS

---

## Como rodar

```bash
npm install
npm run dev
```

O app abre em `http://localhost:5173`:

| Endereço | Tela |
|---|---|
| `/` | Dashboard das TVs |
| `/login` | Login do admin |
| `/admin` | Painel admin (exige login) |

---

## Variáveis de ambiente

| Variável | Arquivo | Descrição |
|---|---|---|
| `VITE_API_URL` | `.env.local` (dev) e painel do Cloudflare (build) | URL base da API. No dev, `http://localhost:3000`; no Cloudflare, o backend no Render |
| `VITE_USE_MOCKS` | `.env.local` | `true` faz o dashboard e o admin usarem dados falsos. Qualquer outro valor usa o backend |

O Vite só lê essas variáveis quando sobe. Depois de mudar alguma, reinicie o `npm run dev`.

Nenhum `.env` vai para o repositório. Para rodar localmente, crie o `.env.local` com a `VITE_API_URL`.

### Ver o dashboard sem backend

Crie o `.env.local` com:

```
VITE_USE_MOCKS=true
```

Os mocks respondem nas mesmas rotas e no mesmo formato do backend, com 18 vendas espalhadas em 4 semanas, para conferir os filtros e as telas semanais. Nenhuma venda nova aparece com o tempo. O login continua real. Detalhes em [MOCKS.md](MOCKS.md).

---

## Vídeo do popup de venda

Coloque um vídeo em **`public/sale-video.mp4`** para ele rodar antes do outdoor a cada venda nova. Sem o arquivo, o popup mostra só o outdoor. O vídeo toca sem som, que é a única forma de um navegador tocar vídeo sozinho.

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção em `dist/`, apontando para o backend da `VITE_API_URL` |
| `npm run build:pages` | Roda os testes e, se passarem, gera o build. É o comando de build do Cloudflare Pages |
| `npm run preview` | Serve o build de produção localmente |
| `npm test` | Roda os testes uma vez e grava o resultado em `public/test-report.json`, que o admin mostra em "Logs de teste" |
| `npm run test:watch` | Roda os testes a cada arquivo salvo |
| `npm run lint` | Roda o oxlint |

---

## Estrutura

O projeto é organizado por feature: o código de um mesmo assunto fica junto.

```
src/
├── app/            rotas e guards (PrivateRoute, PublicRoute)
├── features/
│   ├── auth/       login, sessão e refresh token
│   ├── admin/      painel admin
│   └── dashboard/  dashboard das TVs
├── shared/         cliente HTTP, estilos globais e utilitários usados por mais de uma feature
├── test/           configuração e helpers dos testes
└── main.jsx        providers e router
public/             imagens e vídeo servidos direto (fundos, logo, vídeo do popup) e o relatório de testes
```

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [GUIA_FEATURES.md](GUIA_FEATURES.md) | Como o projeto é organizado e o passo a passo para criar uma feature nova |
| [AUTH_SETUP.md](AUTH_SETUP.md) | Autenticação: Context, refresh token por cookie, interceptor de 401 e proteção de rotas |
| [DASHBOARD.md](DASHBOARD.md) | Dashboard das TVs: carrossel, telas, popup de venda, SSE, mocks, medidas do Figma, testes e o que cada função faz |
| [DEPLOY.md](DEPLOY.md) | Publicação: Cloudflare Pages, variáveis do Render (`FRONT_URL`, `NODE_ENV`, `MONGO_URI`), cookie entre domínios e checklist |
| [ADMIN.md](ADMIN.md) | Painel admin: filtros por semana e por vendedor, lista de vendas e exportação em CSV |
| [MOCKS.md](MOCKS.md) | Dados falsos: o servidor falso, as 18 vendas em 4 semanas, os resultados esperados em cada tela e os testes |
| [ERROS_E_LOGS.md](ERROS_E_LOGS.md) | Tela "Ops, algo deu errado", registro de erros, contrato das rotas `/logs` no backend e os widgets de logs do admin |
