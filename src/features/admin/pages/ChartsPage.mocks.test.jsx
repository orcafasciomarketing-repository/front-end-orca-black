import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import ChartsPage from "./ChartsPage";

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 15000 });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChartsPage />
    </QueryClientProvider>,
  );

const widget = (title) => screen.getByRole("region", { name: title });
const barsOf = (title, list = title) =>
  within(within(widget(title)).getByRole("list", { name: list }))
    .getAllByRole("listitem")
    .map((item) => item.textContent.replace(/ /g, " "));
const lastRowOf = (title) => {
  const rows = within(widget(title)).getAllByRole("row");
  return [...rows.at(-1).querySelectorAll("th, td")].map((cell) => cell.textContent.replace(/ /g, " "));
};

const rowOf = (title, label) => {
  const row = within(widget(title))
    .getAllByRole("row")
    .find((item) => item.querySelector("th")?.textContent === label);
  return [...row.querySelectorAll("th, td")].map((cell) => cell.textContent.replace(/\u00a0/g, " "));
};
const textOf = (element) => element.textContent.replace(/\u00a0/g, " ");

const ready = async () => {
  await waitFor(() => expect(within(widget("Vendas por equipe")).getAllByRole("listitem")).toHaveLength(3));
  await waitFor(() => expect(within(widget("Acumulado x meta")).getByRole("img")).toBeInTheDocument());
};

describe("Gráficos com os dados falsos (quarta, 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("mostra os indicadores e os catorze gráficos", async () => {
    renderPage();
    await ready();

    expect(screen.getByRole("region", { name: "Indicadores" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Acumulado x meta",
      "Forecast",
      "Vendas acumuladas",
      "Vendas acumuladas por setor",
      "Vendas x renovações por dia",
      "Vendas por semana",
      "Calendário de vendas",
      "Vendas por pessoa",
      "Vendas por equipe",
      "Passagens por pessoa",
      "Pontos por equipe",
      "Evolução dos pontos",
      "Ticket médio",
      "Comparar períodos",
      "Participação por setor",
      "Concentração",
      "Cancelamentos",
    ]);
  });

  it("sem filtro, o acumulado chega nos R$ 212 mil da meta, sem as canceladas", async () => {
    renderPage();
    await ready();

    expect(lastRowOf("Vendas acumuladas")).toEqual(["21/10", "R$ 212.000,00"]);
    expect(rowOf("Acumulado x meta", "21/10")).toEqual(["21/10", "R$ 212.000,00", "R$ 212.000,00", "R$ 212.000,00"]);
    expect(lastRowOf("Acumulado x meta")).toEqual(["01/12", "—", "R$ 212.000,00", "R$ 3.000.000,00"]);
    expect(textOf(widget("Acumulado x meta"))).toContain("Cenário realista");
    expect(textOf(widget("Acumulado x meta"))).toContain("com o forecast do backend");
    expect(within(widget("Acumulado x meta")).getByText("Meta R$ 3 mi")).toBeInTheDocument();
    expect(lastRowOf("Vendas acumuladas por setor")).toEqual(["21/10", "R$ 92.000,00", "R$ 120.000,00"]);
  });

  it("vendas por pessoa, por equipe e passagens da campanha inteira", async () => {
    renderPage();
    await ready();

    expect(barsOf("Vendas por pessoa").slice(0, 3)).toEqual([
      "Gustavo RochaR$ 90.000,00",
      "Brenda LimaR$ 25.500,00",
      "Fernanda MeloR$ 22.000,00",
    ]);
    expect(barsOf("Vendas por pessoa")).toHaveLength(11);
    expect(barsOf("Vendas por equipe")).toEqual([
      "OrçawinxR$ 131.000,00",
      "Wizards of salesR$ 49.000,00",
      "Sem freioR$ 32.000,00",
    ]);
    expect(barsOf("Passagens por pessoa")).toEqual([
      "Caio MartinsCS3 passagens",
      "Julia TomazSuporte3 passagens",
      "Izabel RamosSDR2 passagens",
      "Lucas DanielSDR2 passagens",
    ]);
  });

  it("filtrando a semana atual, os gráficos mudam e o acumulado x meta continua na campanha inteira", async () => {
    renderPage();
    await ready();

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar gráficos por período" }), {
      target: { value: "2026-10-19" },
    });

    await waitFor(() => expect(lastRowOf("Vendas acumuladas")).toEqual(["21/10", "R$ 82.000,00"]));
    expect(within(widget("Vendas acumuladas")).getAllByRole("row")).toHaveLength(4);
    expect(barsOf("Vendas por pessoa")).toEqual([
      "Gustavo RochaR$ 45.000,00",
      "Brenda LimaR$ 25.500,00",
      "Joice PereiraR$ 8.000,00",
      "Marcelo DiasR$ 3.500,00",
    ]);
    expect(barsOf("Vendas por equipe")).toEqual([
      "OrçawinxR$ 45.000,00",
      "Wizards of salesR$ 29.000,00",
      "Sem freioR$ 8.000,00",
    ]);
    expect(lastRowOf("Vendas x renovações por dia")[0]).toBe("21/10");
    expect(rowOf("Acumulado x meta", "21/10")[1]).toBe("R$ 212.000,00");
    expect(lastRowOf("Vendas por semana")).toEqual(["Semana de 19/10", "R$ 65.500,00", "R$ 16.500,00"]);

    const kpis = screen.getByRole("region", { name: "Indicadores" });
    expect(textOf(kpis)).toContain("Total vendidoR$ 82.000,00▲ +5,1% vs semana anterior");
    expect(textOf(kpis)).toContain("Vendas fechadas6▲ +20% vs semana anterior");
    expect(textOf(kpis)).toContain("Ticket médioR$ 13.666,67▼ -12,4% vs semana anterior");
    expect(textOf(widget("Cancelamentos"))).toContain("Taxa de cancelamento14,3%");
    expect(barsOf("Cancelamentos", "Valor cancelado por pessoa")).toEqual(["Heitor Alves1 canceladaR$ 20.000,00"]);
  });

  it("sem filtro, mostra previsão, indicadores e as análises da campanha inteira", async () => {
    renderPage();
    await ready();

    const kpis = screen.getByRole("region", { name: "Indicadores" });
    expect(textOf(kpis)).toContain("Total vendidoR$ 212.000,00Campanha inteira");
    expect(textOf(kpis)).toContain("Meta da campanha7,1%de R$ 3.000.000,00");

    expect(
      within(widget("Vendas por semana"))
        .getAllByRole("row")
        .slice(1)
        .map((row) => textOf(row)),
    ).toEqual([
      "Semana de 28/09R$ 9.000,00R$ 4.000,00",
      "Semana de 05/10R$ 33.000,00R$ 6.000,00",
      "Semana de 12/10R$ 69.000,00R$ 9.000,00",
      "Semana de 19/10R$ 65.500,00R$ 16.500,00",
    ]);
    expect(barsOf("Ticket médio", "Ticket médio por setor")).toEqual([
      "B2G5 vendasR$ 24.000,00",
      "B2B11 vendasR$ 8.363,64",
    ]);
    expect(barsOf("Participação por setor")).toEqual(["B2B43,4%R$ 92.000,00", "B2G56,6%R$ 120.000,00"]);
    expect(textOf(widget("Concentração"))).toContain("64,9%do total vem dos 3 maiores vendedores");
    expect(barsOf("Concentração").slice(0, 4)).toEqual([
      "1º Gustavo Rocha42,5%R$ 90.000,00",
      "2º Brenda Lima12%R$ 25.500,00",
      "3º Fernanda Melo10,4%R$ 22.000,00",
      "Demais (8)35,1%R$ 74.500,00▾",
    ]);
    expect(textOf(widget("Cancelamentos"))).toContain(
      "Taxa de cancelamento11,1%Canceladas2 de 18Valor perdidoR$ 27.000,00",
    );
    expect(barsOf("Cancelamentos", "Valor cancelado por pessoa")).toEqual([
      "Heitor Alves1 canceladaR$ 20.000,00",
      "Marcelo Dias1 canceladaR$ 7.000,00",
    ]);
    const october = within(widget("Calendário de vendas")).getByRole("table", { name: "Outubro de 2026" });
    const cellsOf = (row) => [...row.querySelectorAll("th, td")].map((cell) => cell.textContent);
    const octoberRows = within(october).getAllByRole("row");
    expect(within(widget("Calendário de vendas")).getByRole("table", { name: "Setembro de 2026" })).toBeInTheDocument();
    expect(octoberRows.map((row) => cellsOf(row)[0])).toEqual([
      "Semana",
      "28/09",
      "05/10",
      "12/10",
      "19/10",
      "26/10",
      "Total",
    ]);
    expect(cellsOf(octoberRows[4])).toEqual(["19/10", "192", "203", "211", "22", "23", "24", "25", "6"]);
    expect(cellsOf(octoberRows[5])).toEqual(["26/10", "26", "27", "28", "29", "30", "31", "", "0"]);
    expect(cellsOf(octoberRows.at(-1))).toEqual(["Total", "3", "4", "3", "2", "1", "1", "1", "15"]);
    expect(
      within(widget("Calendário de vendas")).getByRole("cell", { name: /Ter, 20\/10: 3 vendas/ }),
    ).toBeInTheDocument();
    expect(
      within(widget("Calendário de vendas")).getByRole("cell", { name: "Sex, 30/10: ainda não chegou" }),
    ).toBeInTheDocument();

    fireEvent.click(within(widget("Concentração")).getByRole("button", { name: /Demais \(8\)/ }));
    expect(barsOf("Concentração", "Detalhes: Demais (8)")).toEqual([
      "4º Danne Costa8,5%R$ 18.000,00",
      "5º Karine Souza7,1%R$ 15.000,00",
      "6º Gabriel Nunes5,2%R$ 11.000,00",
      "7º Heitor Alves4,2%R$ 9.000,00",
      "8º Joice Pereira3,8%R$ 8.000,00",
      "9º Letícia Prado2,8%R$ 6.000,00",
      "10º Giovana Evaristo1,9%R$ 4.000,00",
      "11º Marcelo Dias1,7%R$ 3.500,00",
    ]);
  });

  it("filtrando o setor B2B, todos os gráficos e indicadores mostram só B2B", async () => {
    renderPage();
    await ready();

    expect(
      within(screen.getByRole("combobox", { name: "Filtrar gráficos por setor" }))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todos", "B2B", "B2G"]);

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar gráficos por setor" }), {
      target: { value: "B2B" },
    });

    await waitFor(() => expect(lastRowOf("Vendas acumuladas")).toEqual(["21/10", "R$ 92.000,00"]));
    await waitFor(() => expect(rowOf("Acumulado x meta", "21/10")[1]).toBe("R$ 92.000,00"));
    expect(textOf(widget("Acumulado x meta"))).toContain("B2B contra a meta de B2B");
    expect(textOf(widget("Acumulado x meta"))).toContain("Meta R$ 2 mi");
    expect(barsOf("Participação por setor")).toEqual(["B2B100%R$ 92.000,00"]);
    expect(barsOf("Ticket médio", "Ticket médio por setor")).toEqual(["B2B11 vendasR$ 8.363,64"]);
    expect(barsOf("Vendas por pessoa").map((bar) => bar.split("R$")[0])).not.toContain("Gustavo Rocha");
    expect(barsOf("Cancelamentos", "Valor cancelado por pessoa")).toEqual([
      "Heitor Alves1 canceladaR$ 20.000,00",
      "Marcelo Dias1 canceladaR$ 7.000,00",
    ]);

    const kpis = screen.getByRole("region", { name: "Indicadores" });
    expect(textOf(kpis)).toContain("Total vendidoR$ 92.000,00");
    // Meta do B2B (2 milhões), não mais a meta total
    expect(textOf(kpis)).toContain("Meta B2B4,6%de R$ 2.000.000,00");
  });

  it("com os últimos 7 dias, os indicadores comparam com os 7 dias anteriores", async () => {
    renderPage();
    await ready();

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar gráficos por período" }), {
      target: { value: "last-7" },
    });

    await waitFor(() => expect(lastRowOf("Vendas acumuladas")[0]).toBe("21/10"));
    expect(within(widget("Vendas acumuladas")).getAllByRole("row")).toHaveLength(8);
    expect(textOf(screen.getByRole("region", { name: "Indicadores" }))).toContain("vs período anterior");
  });

  it("comparar períodos: começa em esta semana x semana passada e troca por atalho ou pelo calendário", async () => {
    renderPage();
    await ready();

    const comparison = () => within(widget("Comparar períodos")).getByRole("table", { name: "Comparação dos períodos" });
    const rowOfComparison = (label) =>
      [...within(comparison()).getByRole("rowheader", { name: label }).closest("tr").querySelectorAll("th, td")].map(
        (cell) => textOf(cell),
      );

    await waitFor(() =>
      expect(rowOfComparison("Total vendido")).toEqual(["Total vendido", "R$ 82.000,00", "R$ 45.000,00", "▲ +82,2%"]),
    );
    expect(rowOfComparison("Vendas fechadas")).toEqual(["Vendas fechadas", "6", "2", "▲ +200%"]);
    expect(textOf(comparison())).toContain("A · 19/10 a 21/10");
    expect(textOf(comparison())).toContain("B · 12/10 a 14/10");

    fireEvent.change(within(widget("Comparar períodos")).getByRole("combobox", { name: "Atalho de comparação" }), {
      target: { value: "day" },
    });
    await waitFor(() =>
      expect(rowOfComparison("Total vendido")).toEqual(["Total vendido", "R$ 5.000,00", "R$ 15.000,00", "▼ -66,7%"]),
    );
    expect(textOf(comparison())).toContain("A · qua, 21/10");
    expect(textOf(comparison())).toContain("B · qua, 14/10");

    fireEvent.click(within(widget("Comparar períodos")).getByRole("button", { name: "Período A: qua, 21/10" }));
    const picker = screen.getByRole("dialog", { name: "Período A" });
    fireEvent.click(within(picker).getByRole("button", { name: "13 de outubro de 2026" }));
    fireEvent.click(within(picker).getByRole("button", { name: "13 de outubro de 2026" }));

    await waitFor(() =>
      expect(rowOfComparison("Total vendido")).toEqual(["Total vendido", "R$ 30.000,00", "R$ 15.000,00", "▲ +100%"]),
    );
    expect(within(widget("Comparar períodos")).getByRole("combobox", { name: "Atalho de comparação" })).toHaveValue(
      "custom",
    );
  });

  it("usuário b2b: abre no B2B, sem poder trocar o setor, contra a meta do B2B", async () => {
    render(
      <AuthContext value={{ state: { user: { _id: "1", email: "b2b@teste.com", role: "b2b" }, token: "t" } }}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <ChartsPage />
        </QueryClientProvider>
      </AuthContext>,
    );
    await ready();

    const segmentSelect = screen.getByRole("combobox", { name: "Filtrar gráficos por setor" });
    expect(segmentSelect).toBeDisabled();
    expect(within(segmentSelect).getAllByRole("option").map((option) => option.textContent)).toEqual(["B2B"]);

    await waitFor(() => expect(lastRowOf("Vendas acumuladas")).toEqual(["21/10", "R$ 92.000,00"]));
    expect(textOf(widget("Acumulado x meta"))).toContain("B2B contra a meta de B2B");
    expect(barsOf("Participação por setor")).toEqual(["B2B100%R$ 92.000,00"]);
  });

  it("seções com menu, pontos por equipe e evolução dos pontos", async () => {
    renderPage();
    await ready();

    const nav = screen.getByRole("navigation", { name: "Seções dos gráficos" });
    expect(within(nav).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Visão geral",
      "Vendas",
      "Pessoas e equipes",
      "Análises",
    ]);
    expect(within(screen.getByRole("region", { name: "Pessoas e equipes" })).getByRole("heading", { name: "Pontos por equipe" })).toBeInTheDocument();

    await waitFor(() => expect(within(widget("Pontos por equipe")).getAllByRole("listitem")).toHaveLength(3));
    const teams = within(widget("Pontos por equipe"))
      .getAllByRole("listitem")
      .map((item) => textOf(item));
    expect(teams[0]).toMatch(/^Orçawinx\d+ pontos/);
    expect(teams.every((team) => /venda \d+, renovação \d+, passagem \d+/.test(team))).toBe(true);
    expect(within(widget("Evolução dos pontos")).getByRole("img")).toBeInTheDocument();
    expect(lastRowOf("Evolução dos pontos")[0]).toBe("21/10");
  });

  it("clicar num vendedor abre o perfil dele; Esc e o X fecham", async () => {
    renderPage();
    await ready();

    fireEvent.click(within(widget("Vendas por pessoa")).getByRole("button", { name: "Gustavo Rocha" }));

    const profile = await screen.findByRole("dialog", { name: "Perfil de Gustavo Rocha" });
    await waitFor(() => expect(textOf(profile)).toContain("Total vendidoR$ 90.000,00"));
    expect(textOf(profile)).toContain("1º de 11 em valor vendido");
    expect(textOf(profile)).toContain("Vendas concluídas3");
    expect(textOf(profile)).toContain("Esta semanaR$ 45.000,00");
    expect(within(profile).getByRole("heading", { name: "Últimas vendas" })).toBeInTheDocument();
    expect(textOf(profile)).toContain("Prefeitura de Campinas");

    fireEvent.keyDown(profile, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Perfil de Gustavo Rocha" })).not.toBeInTheDocument();

    fireEvent.click(within(widget("Vendas por pessoa")).getByRole("button", { name: "Brenda Lima" }));
    fireEvent.click(await screen.findByRole("button", { name: "Fechar perfil" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

