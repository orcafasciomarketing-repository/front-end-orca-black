# Deploy

O front roda no **Cloudflare Pages** (plano gratuito) e o backend no **Render**, em `https://back-end-orca-black.onrender.com`.

```
TVs e admin (navegador)
  └── https://<projeto>.pages.dev        Cloudflare Pages: os arquivos do build (dist/)
        └── https://back-end-orca-black.onrender.com   Render: API, SSE e login
```

---

## 1. Endereço do backend

| Arquivo | `VITE_API_URL` | Usado por |
|---|---|---|
| `.env` | `http://localhost:3000` | `npm run dev` (backend rodando na sua máquina) |
| `.env.production` | `https://back-end-orca-black.onrender.com` | `npm run build` e `npm run build:pages` (o Cloudflare) |
| `.env.local` | (não define) | Só `VITE_USE_MOCKS`, para ligar ou desligar os dados falsos |

O Vite escolhe o arquivo sozinho: `vite build` usa o `.env.production`, e `vite` (dev) usa o `.env`. O `.env.production` vai para o git, porque o endereço da API não é segredo, então o Cloudflare usa a URL certa sem nenhuma configuração no painel. Para trocar o backend, mude esse arquivo e faça um novo deploy.

`getApiUrl()` ([src/shared/utils/apiUrl.js](src/shared/utils/apiUrl.js)) lê a `VITE_API_URL` e tira as barras do final. Ela é usada pelo axios (`apiClient`) e pelo SSE (`/sales/events`). Assim, uma URL salva com `/` no final não vira `...onrender.com//sales/events` (404).

---

## 2. Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório do front e configure:

| Campo | Valor |
|---|---|
| Framework preset | `None` (ou `Vite`) |
| Build command | `npm run build:pages` |
| Build output directory | `dist` |
| Root directory | (vazio, a raiz do repositório) |

Em **Settings → Variables and Secrets (Environment variables)**, adicione:

| Variável | Valor | Por quê |
|---|---|---|
| `NODE_VERSION` | `22` | O Vitest exige Node 22.12 ou mais novo, e o `build:pages` roda os testes |

**`npm run build:pages`** é `npm test && vite build`:
- roda os testes antes do build e **para o deploy se algum falhar**, então uma versão com bug não chega às TVs;
- gera o `public/test-report.json`, que vai para o `dist/` e aparece no admin, em **Erros → Logs de teste**.

Para publicar sem rodar os testes, use `npm run build` como comando. Nesse caso o admin mostra "Nenhum relatório encontrado".

**Rotas do SPA (`/admin`, `/admin/erros`, `/login`):** o Cloudflare Pages trata o projeto como SPA quando o build não tem `404.html` na raiz, que é o nosso caso, e devolve o `index.html` para qualquer endereço. Não precisa de `_redirects`. Dá para abrir `/admin/erros` direto ou recarregar a página.

---

## 3. O que configurar no Render (backend)

Estas variáveis ficam no **painel do Render**, em Environment. O front depende delas:

| Variável | Valor | Se faltar |
|---|---|---|
| `FRONT_URL` | O endereço do Pages, **exato e sem barra no final**. Ex.: `https://orca-black.pages.dev` | O CORS bloqueia o front: nada carrega nas TVs nem no admin |
| `NODE_ENV` | `production` | O cookie de login sai sem `sameSite=none` e `secure`, e o navegador não manda o cookie do Pages para o Render: o admin pede login de novo a cada recarga |
| `MONGO_URI` | Ver abaixo | Erro 500 em todas as rotas de dados |

### `MONGO_URI` (erro 500 encontrado em 28/10/2026)

Hoje todas as rotas de dados do Render respondem:
```
500 {"error":"Invalid namespace specified: \".sales\""}
```
O backend sobe e conecta, mas o MongoDB recebe um **nome de banco inválido**. No `.env` local, o `MONGO_URI` está entre aspas e termina em `.mongodb.net/`, sem nome de banco. Localmente o `dotenv` tira as aspas e o Mongo usa o banco padrão, `test`. No Render as aspas não são removidas, e o valor colado provavelmente veio com elas.

Para corrigir, no Render:
1. Cole o valor **sem aspas**.
2. Coloque o **nome do banco** depois da última `/`. Para usar os mesmos dados de hoje, use `test`, o banco que o local usa:
   ```
   mongodb+srv://<usuario>:<senha>@cluster0.k323le3.mongodb.net/test?retryWrites=true&w=majority
   ```
3. Salve. O Render reinicia o serviço.
4. Libere o acesso do Render no MongoDB Atlas (**Network Access**). Como o Render não tem IP fixo no plano gratuito, normalmente é `0.0.0.0/0`.

Para conferir: `https://back-end-orca-black.onrender.com/vendor/list` precisa responder `200` com a lista de vendedores.

---

## 4. Cuidados

### Cookie de login entre domínios
O front (`*.pages.dev`) e o backend (`*.onrender.com`) ficam em **sites diferentes**. Por isso o cookie `refreshToken` é um cookie "de terceiros":
- **Chrome e Edge:** funciona com `NODE_ENV=production` (`sameSite=none` + `secure`).
- **Firefox:** funciona (o cookie fica isolado por site, mas é enviado de volta para o mesmo front).
- **Safari:** bloqueia cookies de terceiros. O login funciona, mas ao recarregar o admin a sessão não é recuperada e pede login de novo.

As TVs não fazem login, então isso só afeta o admin. Para eliminar o problema, use um **domínio próprio** para os dois, por exemplo `painel.suaempresa.com.br` no Pages e `api.suaempresa.com.br` no Render. Com o mesmo site, o cookie deixa de ser de terceiros.

### Deploys de preview do Cloudflare
Cada branch ou pull request ganha um endereço próprio (`<hash>.<projeto>.pages.dev`). Esses endereços **não estão no `FRONT_URL`**, então o CORS do backend bloqueia. Teste os previews com o backend local, ou acrescente o endereço do preview no CORS do backend.

### Render gratuito "dorme"
No plano gratuito, o serviço desliga depois de 15 minutos sem requisições, e a primeira requisição depois disso leva de 30 a 60 segundos.
- **TVs:** buscam dados a cada 60 segundos e mantêm o serviço acordado enquanto estiverem ligadas.
- **SSE:** o backend manda um "ping" a cada 30 segundos, para o proxy do Render não derrubar a conexão das TVs. Se a conexão cair, o `EventSource` reconecta sozinho, e o refetch de 60 segundos corrige os números.
- **Admin aberto de manhã, antes das TVs:** a primeira tela pode demorar enquanto o Render acorda.

### Imagens
O backend não tem mais a pasta `public/`. As fotos dos vendedores e SDRs e as camisetas dos times vêm do `imageUrl` de cada cadastro no banco. Hoje as camisetas do `seed.js` ainda apontam para `http://192.168.1.22:3000/public/...`, que não existe mais. Sem `imageUrl` válido, as telas funcionam normalmente, só sem a imagem (o card do time fica sem camiseta e o popup sem foto). Para as imagens aparecerem, os cadastros precisam de URLs públicas com HTTPS, já que a página é HTTPS e o navegador bloqueia imagens HTTP.

### Logout
O backend ainda não tem `POST /auth/logout`. Hoje nenhum botão chama o logout. Quando for criado o botão "Sair", a rota precisa existir e limpar o cookie.

---

## 5. Checklist

- [ ] Render: `MONGO_URI` sem aspas e com o nome do banco; `/vendor/list` responde 200
- [ ] Render: `NODE_ENV=production`
- [ ] Cloudflare Pages conectado ao repositório, com build `npm run build:pages`, saída `dist` e `NODE_VERSION=22`
- [ ] Render: `FRONT_URL` com o endereço do Pages, sem barra no final
- [ ] Abrir `https://<projeto>.pages.dev/`: o dashboard carrega
- [ ] Abrir `https://<projeto>.pages.dev/admin`: o login funciona e, ao recarregar, continua logado (Chrome)
- [ ] Admin → Erros → Logs de teste mostra o resultado do último deploy
- [ ] Apps Script da planilha apontando para `https://back-end-orca-black.onrender.com/sales/webhook/sheet`
