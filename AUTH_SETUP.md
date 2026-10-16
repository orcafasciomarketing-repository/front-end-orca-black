# Auth Setup

Documentação da estrutura de autenticação do projeto.

---

## Visão geral

O sistema de auth usa React Context + useReducer para o estado global de autenticação, React Router para proteção de rotas, Axios com interceptors para anexar e renovar o token automaticamente, e TanStack Query para a mutation de login.

O fluxo é baseado em **refresh token via cookie HttpOnly**: ao carregar a aplicação, uma chamada ao backend tenta restaurar a sessão. Se o cookie de refresh existir e for válido, o usuário é autenticado e redirecionado para `/admin`.

O access token fica em dois lugares, cada um com um papel:

- **`shared/apiClient.js`** (variável de módulo): anexado automaticamente no header `Authorization` de toda requisição.
- **`AuthContext`** (estado React): usado pelas rotas para saber se o usuário está logado.

---

## Arquivos

```
src/
├── shared/
│   ├── apiClient.js                    # Instância axios (export default), interceptors (token + 401) e refreshSession
│   └── styles/
│       └── global.css                  # Reset global (importado no main.jsx)
├── features/
│   └── auth/
│       ├── api/
│       │   └── authApi.js              # loginUser e logoutUser
│       ├── context/
│       │   ├── AuthContext.jsx         # Provider: restaura sessão, registra interceptor, expõe logout
│       │   └── authReducer.js          # Ações SET_USER, ALTER_TOKEN, REVOKE_DATA, SET_LOADING
│       ├── hooks/
│       │   └── useAuth.js              # Hook de acesso ao AuthContext ({ state, dispatch, logout })
│       └── pages/
│           ├── LoginPage.jsx           # Página de login
│           └── LoginPage.module.css
├── app/
│   ├── PrivateRoute.jsx                # Redireciona para / se não autenticado (guarda a rota de origem)
│   ├── PublicRoute.jsx                 # Redireciona para a rota de origem ou /admin se já autenticado
│   ├── PublicRoute.module.css          # Tela cheia com imagem de fundo, conteúdo centralizado
│   └── Router.jsx                      # Configuração de rotas
└── main.jsx                            # Ordem dos providers e import do CSS global
.env                                    # VITE_API_URL (URL base da API)
```

---

## Dependências

| Pacote                  | Uso                                  |
| ----------------------- | ------------------------------------ |
| `axios`                 | Cliente HTTP e interceptors          |
| `react-router`          | Roteamento, `<Navigate>`, `<Outlet>` |
| `@tanstack/react-query` | Mutation de login e cache de dados   |

```bash
npm install axios react-router @tanstack/react-query
```

A URL da API fica no `.env`:

```
VITE_API_URL=http://192.168.1.22:3000
```

---

## Endpoints esperados no backend

| Método | Rota            | Descrição                                                                          |
| ------ | --------------- | ---------------------------------------------------------------------------------- |
| `POST` | `/auth/login`   | Recebe `{ email, password }`, retorna `{ user, token }` e seta o cookie de refresh |
| `POST` | `/auth/refresh` | Lê o cookie HttpOnly, retorna `{ user, token }`                                    |
| `POST` | `/auth/logout`  | Invalida o refresh token no backend e apaga o cookie                               |

O backend precisa aceitar CORS com credenciais (`Access-Control-Allow-Credentials: true` e origem explícita, não `*`), já que o axios usa `withCredentials: true`.

### Ciclo de vida dos tokens

| Token         | Onde fica       | Duração            | Quando expira                                          |
| ------------- | --------------- | ------------------ | ------------------------------------------------------ |
| Access token  | Memória (JS)    | Curta (ex: 15 min) | Ao vencer, o primeiro 401 dispara o refresh automático |
| Refresh token | Cookie HttpOnly | 30 dias            | Ao vencer os 30 dias ou no logout                      |

Requisitos no backend para esse ciclo funcionar:

- Cookie de refresh com `HttpOnly`, `Secure` (em HTTPS), `SameSite` adequado e `Max-Age` de 30 dias (`2592000` segundos).
- O refresh token precisa ter a própria validade de 30 dias no servidor (JWT `exp` ou registro no banco), não só no cookie.
- `/auth/refresh` responde **401** quando o refresh token expirou ou foi invalidado. É isso que leva o usuário para o login.
- `/auth/logout` invalida o refresh token no servidor (não basta apagar o cookie).
- Se o backend rotacionar o refresh token a cada `/auth/refresh`, o novo token deve **herdar a data de expiração do original**. Senão a sessão vira deslizante e nunca expira enquanto o usuário usar o sistema.

---

## Fluxo de autenticação

### Restauração de sessão (ao carregar a app)

```
App monta
  └─> AuthContextProvider.useEffect
        └─> POST /auth/refresh
              ├─> Sucesso: dispatch SET_USER → isLoading: false
              │     └─> PublicRoute detecta user/token → <Navigate to="/admin">
              └─> Erro: isLoading: false
                    └─> PublicRoute renderiza LoginPage
```

### Login

```
Usuário submete o formulário
  └─> useMutation → POST /auth/login
        └─> onSuccess: dispatch SET_USER
              └─> PublicRoute redireciona para a rota de origem (ou /admin)
```

### Token expirado durante o uso (interceptor 401)

```
Requisição qualquer → 401
  └─> interceptor: POST /auth/refresh (compartilhado entre 401s simultâneos)
        ├─> Sucesso: dispatch ALTER_TOKEN + reexecuta a requisição original
        └─> Erro: dispatch REVOKE_DATA → PrivateRoute manda para /
```

Isso se repete a cada vez que o access token expira, até o refresh token vencer (30 dias). A partir daí o refresh responde 401 e o usuário volta para o login.

`/auth/login` e `/auth/refresh` nunca disparam refresh: senha errada retorna o erro normalmente, e um 401 no refresh encerra a sessão em vez de entrar em loop.

### Logout

```js
const { logout } = useAuth();
await logout();
```

Chama `POST /auth/logout` (invalida o refresh token e apaga o cookie), limpa o estado e o cache do React Query. Se o access token já tiver expirado, o logout passa pelo refresh automático antes, para garantir que o refresh token seja invalidado. Despachar só `REVOKE_DATA` **não** basta: o cookie continuaria válido e a sessão voltaria ao recarregar a página.

---

## Como estender

### Nova rota protegida

Em `src/app/Router.jsx`, dentro do `PrivateRoute`:

```jsx
{
  path: "/admin",
  element: <PrivateRoute />,
  children: [
    { index: true, element: <AdminPanel /> },
    { path: "settings", element: <SettingsPage /> },
  ],
}
```

### Nova chamada autenticada

Crie a função no `api/` da feature, usando a instância exportada por `shared/apiClient.js`. O token é anexado sozinho, não precisa receber `token` por parâmetro. Em `features/sales/api/salesApi.js`:

```js
import api from "../../../shared/apiClient";

export const getSales = async () => {
  const response = await api.get("/sales");
  return response.data;
};
```

O passo a passo completo de uma feature nova está em [GUIA_FEATURES.md](GUIA_FEATURES.md).

### Usuário logado em qualquer componente

```js
const { state } = useAuth();
state.user;
```

---

## Ordem dos providers no `main.jsx`

`AuthContextProvider` fica **dentro** do `QueryClientProvider` (usa `useQueryClient` para limpar o cache no logout) e **fora** do `RouterProvider` (acessível por toda a árvore de rotas):

```jsx
<QueryClientProvider client={queryClient}>
  <AuthContextProvider>
    <RouterProvider router={router} />
  </AuthContextProvider>
</QueryClientProvider>
```

> `AuthContextProvider` não pode usar `useNavigate()` porque está fora do router. Todo redirecionamento é feito pelo `PrivateRoute`/`PublicRoute`.
