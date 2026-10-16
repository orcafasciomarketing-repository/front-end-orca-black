# Guia de estrutura e novas features

Como o código deste projeto é organizado e o passo a passo para adicionar uma feature nova (ex.: produtos, pedidos, cupons).

---

## A ideia: organizar por assunto, não por tipo de arquivo

O projeto é **feature-based**: o código de um mesmo assunto fica junto. Tudo que é de "produtos" (chamadas à API, hooks, componentes, páginas, estilos) mora em `features/products/`. Para entender, alterar ou apagar uma feature, você mexe em uma pasta só.

A alternativa, separar por tipo (`components/`, `hooks/`, `services/` na raiz), funciona em projetos pequenos, mas espalha cada feature por várias pastas conforme o app cresce.

O `src/` tem três camadas:

```
src/
├── app/        # Monta a aplicação: rotas, guards, layout geral, providers
├── features/   # Um diretório por assunto do negócio (auth, products, orders...)
├── shared/     # O que é usado por várias features e não pertence a nenhuma
└── main.jsx    # Ponto de entrada: providers e router
```

### Regra de dependência

```
app  ──►  features  ──►  shared
```

- **`app`** pode importar de `features` e de `shared`.
- **`features`** podem importar de `shared`.
- **`shared` nunca importa de `features` nem de `app`.** Se precisar, o código não é compartilhado: ele pertence a uma feature.
- **Uma feature evita importar de outra.** A exceção é `auth`, que todo mundo pode usar via `useAuth()`. Se duas features precisam do mesmo componente ou função, ele vai para `shared`.

Seguir essa direção evita importações circulares e garante que apagar uma feature não quebre as outras.

---

## Estrutura completa (com uma feature de exemplo)

```
src/
├── app/
│   ├── Router.jsx                  # Todas as rotas do app
│   ├── PrivateRoute.jsx            # Guard: só logado
│   ├── PublicRoute.jsx             # Guard: só deslogado
│   └── PublicRoute.module.css
├── features/
│   ├── auth/
│   │   ├── api/authApi.js          # loginUser, logoutUser
│   │   ├── context/                # AuthContext + authReducer (estado global de auth)
│   │   ├── hooks/useAuth.js
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       └── LoginPage.module.css
│   └── products/                   # ← exemplo de feature nova
│       ├── api/productsApi.js      # Funções que chamam o backend
│       ├── hooks/useProducts.js    # useQuery / useMutation da feature
│       ├── components/             # Pedaços de tela usados só nesta feature
│       │   ├── ProductCard.jsx
│       │   └── ProductCard.module.css
│       └── pages/                  # Telas ligadas a uma rota
│           ├── ProductsPage.jsx
│           └── ProductsPage.module.css
├── shared/
│   ├── apiClient.js                # Instância do axios + interceptors
│   ├── components/                 # Componentes genéricos (Button, Modal...) usados por 2+ features
│   └── styles/global.css           # Reset e estilos globais
└── main.jsx
```

### O que vai em cada pasta de uma feature

Crie só as pastas que a feature usa. Uma feature simples pode ter apenas `api/`, `hooks/` e `pages/`.

| Pasta | O que contém | Exemplo |
|---|---|---|
| `api/` | Funções que fazem as requisições. Não usam React | `getProducts`, `createProduct` |
| `hooks/` | Hooks da feature, principalmente `useQuery`/`useMutation` em volta das funções de `api/` | `useProducts`, `useCreateProduct` |
| `pages/` | Componentes que são uma **rota** (aparecem no `Router.jsx`) | `ProductsPage` |
| `components/` | Pedaços de tela usados pelas páginas da feature | `ProductCard`, `ProductForm` |
| `context/` | Só se a feature tiver **estado de cliente** compartilhado entre várias telas. Dados que vêm da API ficam no React Query, não em context | `AuthContext` |

### Convenções de nome

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componente e página | PascalCase, `.jsx` | `ProductCard.jsx` |
| Estilo | CSS Module com o mesmo nome, na mesma pasta | `ProductCard.module.css` |
| Hook | `use` + nome, `.js` (ou `.jsx` se tiver JSX) | `useProducts.js` |
| Arquivo de API | nome da feature + `Api.js` | `productsApi.js` |
| Classes CSS | camelCase | `.cardTitle` → `styles.cardTitle` |

---

## Passo a passo: criar uma feature nova

O exemplo abaixo cria a feature **produtos**, com uma listagem em `/admin/products` e um botão de cadastro.

### 1. Funções de API: `features/products/api/productsApi.js`

Use a instância do axios de `shared/apiClient.js`. Ela já envia o token e renova a sessão quando recebe 401, então as funções não precisam lidar com autenticação.

```js
import api from "../../../shared/apiClient";

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post("/products", productData);
  return response.data;
};
```

Devolva sempre o `response.data`. Assim, quem chama recebe só os dados, sem o envelope do axios.

### 2. Hooks com React Query: `features/products/hooks/useProducts.js`

```js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createProduct, getProducts } from "../api/productsApi";

export const productKeys = {
  all: ["products"],
  detail: (id) => ["products", id],
};

export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: getProducts,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
```

- **`productKeys`** centraliza as chaves do cache da feature. Assim, quem lê e quem invalida usam a mesma chave, sem erro de digitação.
- **`invalidateQueries`** depois de criar, editar ou apagar faz a listagem buscar os dados de novo sozinha.

### 3. Página: `features/products/pages/ProductsPage.jsx`

```jsx
import { useProducts } from "../hooks/useProducts";
import ProductCard from "../components/ProductCard";

import styles from "./ProductsPage.module.css";

export default function ProductsPage() {
  const { data: products, isLoading, isError } = useProducts();

  if (isLoading) {
    return <p>Carregando...</p>;
  }

  if (isError) {
    return <p>Não foi possível carregar os produtos</p>;
  }

  return (
    <section className={styles.list}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  );
}
```

A página não chama o axios diretamente: ela usa o hook, o hook usa a função de `api/`. Cada camada tem um papel só.

### 4. Registrar a rota: `app/Router.jsx`

Telas que exigem login entram como filhas de `/admin`, e assim herdam a proteção do `PrivateRoute`:

```jsx
import ProductsPage from "../features/products/pages/ProductsPage";

{
  path: "/admin",
  element: <PrivateRoute />,
  children: [
    { index: true, element: <div>Admin Panel</div> },
    { path: "products", element: <ProductsPage /> },
  ],
},
```

Telas públicas (cadastro, recuperar senha) entram como filhas da rota com `PublicRoute`.

### 5. Provider (só se a feature tiver um)

Se a feature criou um context, coloque o Provider no `main.jsx`:
- **dentro** do `QueryClientProvider`, se ele usar `useQueryClient`;
- **fora** do `RouterProvider`, se as rotas precisarem dele.

A maioria das features **não precisa** de Provider: dados do servidor ficam no React Query.

---

## Quando mover algo para `shared`

Mova para `shared` quando **duas ou mais features** usarem o mesmo código. Até lá, deixe dentro da feature. Mover cedo demais cria código "genérico" que só uma tela usa, e fica mais difícil de mudar.

| Situação | Onde fica |
|---|---|
| Botão estilizado usado em login, produtos e pedidos | `shared/components/Button.jsx` |
| Função que formata preço em R$, usada em produtos e pedidos | `shared/utils/formatPrice.js` |
| Card de produto usado só na listagem de produtos | `features/products/components/` |
| Chamada `GET /orders` | `features/orders/api/ordersApi.js` (nunca em `shared/apiClient.js`) |

---

## Checklist de uma feature nova

- [ ] Pasta `src/features/<feature>/` criada, só com as subpastas necessárias
- [ ] Chamadas ao backend em `api/<feature>Api.js`, usando a instância de `shared/apiClient.js`
- [ ] `useQuery`/`useMutation` em `hooks/`, com as query keys centralizadas
- [ ] Mutations invalidam as queries afetadas no `onSuccess`
- [ ] Páginas em `pages/`, componentes auxiliares em `components/`
- [ ] Cada componente com o seu `.module.css` ao lado
- [ ] Rota registrada em `app/Router.jsx` (dentro de `/admin` se for privada)
- [ ] Nenhum import de outra feature (exceto `useAuth`) e nenhum import de `features/` dentro de `shared/`
