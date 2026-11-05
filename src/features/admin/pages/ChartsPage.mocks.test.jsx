import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const barsOf = (title) =>
  within(within(widget(title)).getByRole("list", { name: title }))
    .getAllByRole("listitem")
    .map((item) => item.textContent.replace(/ /g, " "));
const lastRowOf = (title) => {
  const rows = within(widget(title)).getAllByRole("row");
  return [...rows.at(-1).querySelectorAll("th, td")].map((cell) => cell.textContent.replace(/ /g, " "));
};

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

  it("mostra os sete gráficos", async () => {
    renderPage();
    await ready();

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Vendas acumuladas",
      "Vendas acumuladas por setor",
      "Acumulado x meta",
      "Vendas x renovações por dia",
      "Vendas por pessoa",
      "Vendas por equipe",
      "Passagens por pessoa",
    ]);
  });

  it("sem filtro, o acumulado chega nos R$ 212 mil da meta, sem as canceladas", async () => {
    renderPage();
    await ready();

    expect(lastRowOf("Vendas acumuladas")).toEqual(["21/10", "R$ 212.000,00"]);
    expect(lastRowOf("Acumulado x meta")).toEqual(["21/10", "R$ 212.000,00"]);
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

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar gráficos por semana" }), {
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
    expect(lastRowOf("Acumulado x meta")).toEqual(["21/10", "R$ 212.000,00"]);
  });
});
