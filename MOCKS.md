# Dados falsos (mocks)

Como funcionam os dados falsos que deixam ver o dashboard das TVs e o admin sem vendas reais no banco, e quais testes provam que cada semana mostra só os seus dados.

O código não tem comentários de propósito. Toda explicação fica neste documento.

---

## 1. Como ligar

No `.env.local`, na raiz do projeto:

```
VITE_USE_MOCKS=true
```

Reinicie o `npm run dev`. Para voltar ao backend, use `false`.

Com os mocks ligados:
- **dashboard das TVs** e **admin** usam os mesmos dados falsos;
- o **login** continua real (o backend precisa estar ligado para entrar no `/admin`);
- **nenhuma venda nova aparece com o tempo**: o SSE dos mocks não envia nada, então os números ficam parados e dá para conferir com calma;
- os **logs de erro** ficam guardados no navegador (ver [ERROS_E_LOGS.md](ERROS_E_LOGS.md)).

Os testes **não** dependem do `.env.local`: o `vite.config.js` fixa `VITE_USE_MOCKS=false` nos testes, e os testes que usam mocks ligam com `vi.stubEnv`.

---

## 2. Como funciona

```
API do front (dashboardApi, slidesApi)
  └── http.get(url, { params })                 shared/httpClient.js
        ├── VITE_USE_MOCKS=true  → mockApi.get  shared/mocks/mockApi.js
        │       └── resolveMockRequest(url, params)
        │             ├── buildMockDatabase(agora)     shared/mocks/mockDatabase.js
        │             └── mesma regra do backend       shared/mocks/mockBackend.js
        └── senão                → api.get (axios, backend real)
```

**Por que um "servidor falso" e não dados prontos:** os mocks respondem **nas mesmas rotas e no mesmo formato** do backend (`{ success, data, message }`). As funções da API do front, os hooks e as telas fazem exatamente o mesmo caminho do servidor real. O que funciona com os mocks funciona com o backend.

**Por que em `shared/`:** os mesmos dados servem o dashboard e o admin. Pela regra do [GUIA_FEATURES.md](GUIA_FEATURES.md), o que duas features usam fica em `shared/`.

### `http.get(...args)`
[src/shared/httpClient.js](src/shared/httpClient.js). Escolhe, **a cada chamada**, entre `mockApi.get` e o `api.get` do axios, e repassa os argumentos sem mudar nada. Todas as chamadas `GET` do dashboard e do admin passam por ele (`/logs` continua usando o próprio caminho de mocks do registro de erros).

### `mockApi.get(url, config)` e `resolveMockRequest(url, params, agora)`
[src/shared/mocks/mockApi.js](src/shared/mocks/mockApi.js)

`resolveMockRequest` monta o banco falso para o horário atual, procura a rota e devolve `{ status, data }`. `mockApi.get` espera 300 ms (para dar para ver o "Carregando...") e:
- com status 200, resolve com `{ status, data: { success: true, data, message } }`, igual ao axios;
- com rota desconhecida, rejeita com `Request failed with status code 404`, igual ao axios.

| Rota | Responde |
|---|---|
| `/analytics/goal` | `{ goal, total, percent }` |
| `/analytics/scoreboard` e `/scoreboard/last-week` | lista de times com `sales`, `farm`, `passage` e `total` |
| `/analytics/ranking` e `/ranking/last-week` | `{ vendor: [top 3] }` |
| `/analytics/sdr-ranking` e `/sdr-ranking/last-week` | lista top 3 |
| `/sales/admin` | `{ data: [todas as vendas, populadas], total }` |
| `/sales/get` | `{ data: [vendas ativas da semana atual], total }` |
| `/sales/get/:vendorId` | `{ data: [vendas do vendedor], total }` |
| `/vendor/list` e `/sdr/list` | cadastros |

Como no backend, `period` diferente de `"week"` vira `"all"`, e `vendorDepartment` diferente de `"farm"` vira `"sales"`.

`subscribeToMockSalesEvents()` é o SSE dos mocks: não envia nada e devolve uma função vazia para fechar.

### Regras copiadas do backend
[src/shared/mocks/mockBackend.js](src/shared/mocks/mockBackend.js)

As funções são cópias da lógica do backend, para os números baterem com o servidor real:

| Função | Cópia de | O que faz |
|---|---|---|
| `POINTS` | `config/points.js` + `.env` | Venda = 2, renovação = 1, passagem = 1 |
| `BLACK_FRIDAY_GOAL` | `.env` | R$ 3.000.000 |
| `getWeekRange(semanasAtrás, agora)` | `salesService.getWeekRange` | Segunda 00:00 a domingo 23:59:59.999, horário de São Paulo |
| `findActiveByPeriod(db, período, agora)` | `salesService.findActiveByPeriod` | Vendas **ativas** da semana atual (`week`), passada (`lastWeek`) ou todas (`all`) |
| `populateSale(db, venda)` | `.populate("vendorId").populate("sdrIds")` | Troca o id do vendedor pelo cadastro dele e a lista `sdrIds` pela lista de cadastros das pessoas da passagem |
| `findAllSales(db)` | `salesRepository.findAll` | Todas as vendas (inclusive canceladas), da mais nova para a mais antiga |
| `findSalesByVendor(db, id)` | `salesRepository.findByVendor` | Todas as vendas de um vendedor |
| `findActiveSalesOfCurrentWeek(db, agora)` | `salesService.findActiveByWeek` | Vendas ativas da semana atual |
| `getGoalProgress(db)` | `analyticsService.getGoalProgress` | Soma das vendas ativas e o percentual da meta |
| `getScoreboard(db, período, agora)` | `analyticsService.getScoreboard` | Pontos por time: venda e renovação para o time do vendedor; **cada pessoa** da passagem dá 1 ponto de passagem para o time dela |
| `getVendorRanking(db, período, tipo, agora)` | `analyticsService.getVendorRanking` | Top 3 vendedores do tipo (`sales` ou `farm`) |
| `getSdrRanking(db, período, agora)` | `analyticsService.getSdrRanking` | Top 3 de passagens. **Cada pessoa** da passagem ganha o ponto, mesmo que a venda tenha várias |

**Se uma regra mudar no backend, mude aqui também.** Os testes do `mockBackend` mostram os números esperados.

### O banco falso
[src/shared/mocks/mockDatabase.js](src/shared/mocks/mockDatabase.js)

`buildMockDatabase(agora)` monta `{ teams, vendors, sdrs, sales }` no formato dos models do backend. Os cadastros vêm **sem `imageUrl`**, como o backend faz quando o cadastro não tem foto. O `public/` do backend, de onde vinham as imagens, foi removido. As telas mostram os cards sem camiseta e o popup sem foto.

**As datas são relativas a "agora".** Cada venda diz em que semana está (0 = atual, 1 = passada...) e quando, dentro da semana. Assim os dados sempre caem na semana atual e nas anteriores, qualquer que seja o dia em que você abrir. As vendas da semana atual ficam sempre **antes** de agora, distribuídas entre a segunda 00:00 e o momento atual, então nada fica no futuro.

`resolveDate(when, agora)` transforma a posição em data:
- `{ week, day, hour }`: dia da semana (0 = segunda) e hora, no horário de São Paulo;
- `{ week, progress }`: fração do tempo entre a segunda 00:00 e agora (só na semana atual);
- `{ week, edge: "start" }`: exatamente segunda 00:00:00;
- `{ week, edge: "end" }`: exatamente domingo 23:59:59.999.

---

## 3. Os dados

3 times, 11 vendedores, 4 SDRs e **18 vendas em 4 semanas**:

| Semana | Venda | Vendedor | Tipo | Passagem | Valor | Status |
|---|---|---|---|---|---|---|
| **Atual** | Construtora Horizonte | Brenda Lima | Vendas B2B | **Izabel Ramos e Lucas Daniel** | 12.000 | Ativa |
| | Edifício Aurora | Brenda Lima | Vendas B2B | — | 8.500 | Ativa |
| | Prefeitura de Campinas | Gustavo Rocha | Vendas B2G | — | 45.000 | Ativa |
| | Secretaria de Obras SP | Joice Pereira | Renovação B2G | Caio Martins | 8.000 | Ativa |
| | Reforma Vila Nova | Brenda Lima | Renovação B2B | — | 5.000 | Ativa |
| | Galpão Logístico Sul | Heitor Alves | Vendas B2B | — | 20.000 | **Cancelada** |
| | Condomínio Jardins | Marcelo Dias | Renovação B2B | Julia Tomaz | 3.500 | Ativa, **segunda 00:00** |
| **Passada** | Governo do Estado MG | Gustavo Rocha | Vendas B2G | Julia Tomaz | 30.000 | Ativa |
| | Câmara Municipal BH | Gustavo Rocha | Vendas B2G | — | 15.000 | Ativa |
| | Shopping Central | Karine Souza | Renovação B2B | — | 9.000 | Ativa |
| | Hospital Santa Clara | Danne Costa | Vendas B2B | **Izabel Ramos e Julia Tomaz** | 18.000 | Ativa |
| | Escola Nova Era | Marcelo Dias | Vendas B2B | — | 7.000 | **Cancelada** |
| | Clínica Bem Viver | Karine Souza | Vendas B2B | Caio Martins | 6.000 | Ativa, **domingo 23:59** |
| **2 semanas atrás** | Prefeitura de Santos | Fernanda Melo | Vendas B2G | Lucas Daniel | 22.000 | Ativa |
| | Residencial Primavera | Letícia Prado | Renovação B2B | — | 6.000 | Ativa |
| | Loja Matriz Centro | Gabriel Nunes | Vendas B2B | — | 11.000 | Ativa |
| **3 semanas atrás** | Hotel Beira Mar | Giovana Evaristo | Renovação B2B | — | 4.000 | Ativa |
| | Indústria Metalúrgica | Heitor Alves | Vendas B2B | Caio Martins | 9.000 | Ativa |

**Por que esses dados:**
- **Karine e Danne só vendem na semana passada.** Se aparecerem em alguma tela "semanal", a semana passada está vazando para a atual.
- **O líder muda de semana para semana.** Na atual, Brenda lidera vendas e Wizards lidera o placar; na passada, Gustavo e Orçawinx; no acumulado, Gustavo e Orçawinx.
- **Vendas canceladas** (Galpão Logístico Sul e Escola Nova Era) aparecem no admin, mas não pontuam nem entram na meta.
- **Duas vendas exatamente nos limites:** Condomínio Jardins na segunda 00:00 (conta na semana atual) e Clínica Bem Viver no domingo 23:59:59 (conta na passada).
- **Vendas com 0, 1 e 2 passagens** (`sdrIds` é uma lista, como no backend), de vendas e de renovação, B2B e B2G, para testar todas as colunas do relatório. Construtora Horizonte tem duas pessoas do **mesmo time** (Wizards ganha 2 pontos de passagem); Hospital Santa Clara tem duas pessoas de **times diferentes** (Wizards e Sem freio ganham 1 cada).

### Resultados esperados

| Tela | Semana atual | Geral (campanha) |
|---|---|---|
| Ranking de equipes | Wizards 8 · Orçawinx 3 · Sem freio 2 | Orçawinx 15 · Wizards 14 · Sem freio 7 |
| Artilheiros · Vendas | Brenda 4 · Gustavo 2 | Gustavo 6 · Brenda 4 · … |
| Artilheiros · Farmer | Brenda, Joice e Marcelo com 1 | Brenda, Joice e Karine (empate em 1) |
| Assistências | Izabel, Caio, Julia e Lucas com 1 (o top 3 mostra os três primeiros pela ordem do cadastro) | Caio 3 · Julia 3 · Izabel 2 |
| Meta | — | R$ 212.000,00 de R$ 3.000.000,00 (7,07%) |
| Admin · Todas as semanas | — | 18 vendas |
| Admin · semana atual / passada / 2 atrás / 3 atrás | 7 / 6 / 3 / 2 vendas | — |

Semana passada no placar: Orçawinx 8 · Sem freio 4 · Wizards 1.

---

## 4. Testes

| Arquivo | Garante |
|---|---|
| `shared/mocks/mockBackend.test.js` | Limites da semana atual e da passada; 18 vendas, nenhuma no futuro; formato do model de vendas; ids de vendedor e SDR existem; cadastros sem `imageUrl`; cada período traz só as suas vendas; **nenhuma venda da semana passada na atual**; segunda 00:00 conta na atual e domingo 23:59 na passada; canceladas fora de todos os períodos; **venda com 0, 1 ou 2 passagens; cada pessoa da passagem ganha o ponto; cada uma soma no próprio time; duas do mesmo time dão 2 pontos ao time**; placar da semana atual, da passada e da campanha; time sem pontos aparece; rankings de vendas e farmer por semana e geral; quem só vendeu na semana passada não aparece na atual; cancelada não pontua; top 3; passagens; meta; `/sales/admin`, `/sales/get/:vendorId` e `/sales/get` |
| `shared/mocks/mockApi.test.js` | Envelope do backend; `ranking` com `period` e `vendorDepartment`; valores inválidos viram o padrão; rotas `/last-week`; `sdr-ranking` sem objeto em volta; rotas de vendas com `{ data, total }`; cadastros; 404; rejeição igual ao axios; SSE dos mocks não envia nada |
| `features/dashboard/screens/weekIsolation.mocks.test.jsx` | Renderiza as **telas reais das TVs** com os mocks: equipes semanal (8, 3, 2) e geral; artilheiros de vendas semanal sem Karine e Danne; Heitor (cancelado) fora; farmer semanal sem a Karine; vendas e farmer geral; assistências semanal e geral; meta |
| `features/admin/pages/AdminPanel.mocks.test.jsx` | Renderiza o **admin real** com os mocks: opções de semana; "Todas" com as 18 vendas e o relatório com 18 linhas; **cada uma das 4 semanas** com a lista e o relatório trazendo só as vendas daquela semana e nenhuma das outras; limites de segunda 00:00 e domingo 23:59; semana passada + Gustavo; Gustavo em todas as semanas; Karine na semana atual (vazio, relatório só com cabeçalho); colunas traduzidas do relatório; rankings da campanha e a aba Renovação |

Todos esses testes fixam a data em quarta, 21/10/2026, 12h em São Paulo (`vi.setSystemTime`), para os resultados não dependerem do dia em que rodam.

Os dois testes de integração (`*.mocks.test.jsx`) esperam até 4 segundos por cada resultado (`configure({ asyncUtilTimeout: 4000 })`), em vez de 1 segundo, que é o padrão. O servidor falso tem 300 ms de atraso por requisição e o admin faz várias em sequência. Com a suíte inteira rodando em paralelo, 1 segundo às vezes não bastava.

**Os testes pegam erro de verdade:** com o cálculo de semana do admin ignorando o horário de São Paulo, 9 testes falharam (limites, cada semana e o relatório).

---

## 5. Relatórios de exemplo

Com os mocks ligados, o **Exportar** do admin gera, por exemplo, o relatório da semana atual:

```
Negociação;Status;Valor (R$);Tipo;Segmento;Vendedor;Passagem;Data da venda;ID na RD
Galpão Logístico Sul;Cancelada;20000,00;Vendas;B2B;Heitor Alves;;22/10/2026, 07:58;rd-deal-c6
Reforma Vila Nova;Ativa;5000,00;Renovação;B2B;Brenda Lima;;21/10/2026, 23:05;rd-deal-c5
Secretaria de Obras SP;Ativa;8000,00;Renovação;B2G;Joice Pereira;Caio Martins;21/10/2026, 14:12;rd-deal-c4
Prefeitura de Campinas;Ativa;45000,00;Vendas;B2G;Gustavo Rocha;;21/10/2026, 05:19;rd-deal-c3
Edifício Aurora;Ativa;8500,00;Vendas;B2B;Brenda Lima;;20/10/2026, 20:25;rd-deal-c2
Construtora Horizonte;Ativa;12000,00;Vendas;B2B;Brenda Lima;Izabel Ramos, Lucas Daniel;19/10/2026, 17:46;rd-deal-c1
Condomínio Jardins;Ativa;3500,00;Renovação;B2B;Marcelo Dias;Julia Tomaz;19/10/2026, 00:00;rd-deal-c7
```

Os horários das vendas da semana atual mudam conforme o momento em que a página é aberta, porque ficam sempre entre a segunda 00:00 e agora.
