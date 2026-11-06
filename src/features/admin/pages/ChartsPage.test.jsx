import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getForecast } from "../api/forecastApi";
import { getAdminSales, getGoal, getTeams } from "../api/slidesApi";
import { buildForecast } from "../../../shared/mocks/mockForecast";
import { downloadFile } from "../utils/downloadFile";
import ChartsPage from "./ChartsPage";

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 15000 });

vi.mock("../api/slidesApi", () => ({
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
  getGoal: vi.fn(),
  getTeams: vi.fn(),
}));
vi.mock("../api/forecastApi", () => ({
  getForecast: vi.fn(),
}));
vi.mock("../utils/downloadFile", () => ({
  downloadFile: vi.fn(),
}));
vi.mock("../../../shared/errorLogger", () => ({
  reportError: vi.fn(),
}));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChartsPage />
    </QueryClientProvider>,
  );

const widget = (title) => screen.getByRole("region", { name: title });

const sale = {
  _id: "a",
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  value: 1000,
  vendorId: { _id: "v1", vendorName: "Bruno", teamId: "t1" },
  sdrIds: [],
  realizedAt: "2026-10-20T15:00:00.000Z",
};

describe("ChartsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T15:00:00.000Z"));
    getGoal.mockResolvedValue({ goal: 3000000, total: 1000, percent: 0.03 });
    getTeams.mockResolvedValue([{ teamId: "t1", teamName: "Wizards" }]);
    getAdminSales.mockResolvedValue({ sales: [sale], total: 1 });
    getForecast.mockResolvedValue({ segment: null, goalIsTotal: true, ...buildForecast({ sales: [], goal: 3000000 }) });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("sem vendas, cada gráfico avisa que não tem dados", async () => {
    getAdminSales.mockResolvedValue({ sales: [], total: 0 });

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Nenhuma venda no período")).toHaveLength(9));
    expect(within(widget("Acumulado x meta")).getByText("Nenhuma venda ainda")).toBeInTheDocument();
    expect(within(widget("Passagens por pessoa")).getByText("Nenhuma passagem no período")).toBeInTheDocument();
    await waitFor(() => expect(within(widget("Vendas por equipe")).getByText(/Wizards/)).toBeInTheDocument());
  });

  it("se as equipes não carregam, só o gráfico de equipes mostra erro", async () => {
    getTeams.mockRejectedValue(new Error("falhou"));

    renderPage();

    await waitFor(() => expect(within(widget("Vendas por pessoa")).getByText(/Bruno/)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole("region", { name: "Vendas por equipe" })).not.toBeInTheDocument());
    expect(widget("Vendas acumuladas")).toBeInTheDocument();
    expect(widget("Passagens por pessoa")).toBeInTheDocument();
  });

  it("navegando pelo gráfico com as setas, mostra o valor de cada dia", async () => {
    renderPage();

    const chart = await within(await screen.findByRole("region", { name: "Vendas acumuladas" })).findByRole("img");
    const tooltip = () => within(widget("Vendas acumuladas")).getByRole("status");

    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(tooltip()).toHaveTextContent(/20\/10.*R\$\s1\.000,00/);

    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(tooltip()).toHaveTextContent("21/10");

    fireEvent.keyDown(chart, { key: "ArrowRight" });
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(tooltip()).toHaveTextContent("22/10");

    fireEvent.blur(chart);
    expect(within(widget("Vendas acumuladas")).queryByRole("status")).not.toBeInTheDocument();
  });

  it("o botão CSV baixa os dados do gráfico", async () => {
    renderPage();

    const button = await within(await screen.findByRole("region", { name: "Vendas por pessoa" })).findByRole("button", {
      name: "Exportar CSV: Vendas por pessoa",
    });
    fireEvent.click(button);

    expect(downloadFile).toHaveBeenCalledWith(
      "\uFEFFVendedor;Valor (R$)\r\nBruno;1000,00",
      "grafico-vendas-por-pessoa-2026-10-22.csv",
      "text/csv;charset=utf-8",
    );
  });

  it("a aba Gráficos não tem mais botão próprio de modo escuro: o tema vem do menu lateral", async () => {
    renderPage();

    expect(screen.queryByRole("button", { name: "Modo escuro" })).not.toBeInTheDocument();
  });

  it("Gerar PDF: escolhe os widgets, imprime só eles com o cabeçalho e volta ao normal depois", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderPage();
    await within(await screen.findByRole("region", { name: "Vendas por pessoa" })).findByText(/Bruno/);

    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Gerar relatório em PDF" });
    const selectAll = within(dialog).getByRole("checkbox", { name: /Selecionar todos/ });
    const options = within(dialog).getAllByRole("listitem");

    expect(options.map((option) => option.textContent)).toEqual([
      "Indicadores",
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
    expect(selectAll).toBeChecked();
    expect(within(dialog).getByText("18 de 18")).toBeInTheDocument();

    fireEvent.click(selectAll);
    expect(within(dialog).getByRole("button", { name: "Gerar PDF" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Vendas por pessoa" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Indicadores" }));
    expect(selectAll).not.toBeChecked();
    expect(selectAll.indeterminate).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Gerar PDF" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Relatório de vendas · Black Friday")).toBeInTheDocument();
    expect(screen.getByText(/Período: Todo o período · Setor: Todos · Gerado em/)).toBeInTheDocument();

    const printed = (title) => !screen.getByRole("region", { name: title }).closest("div[class*='notPrinted']");
    expect(printed("Vendas por pessoa")).toBe(true);
    expect(printed("Indicadores")).toBe(true);
    expect(printed("Vendas acumuladas")).toBe(false);
    expect(printed("Cancelamentos")).toBe(false);

    fireEvent(window, new Event("afterprint"));
    await waitFor(() => expect(screen.queryByText("Relatório de vendas · Black Friday")).not.toBeInTheDocument());
    expect(printed("Vendas acumuladas")).toBe(true);
    print.mockRestore();
  });

  it("Gerar PDF com todos selecionados imprime a página inteira; Cancelar e Esc fecham sem imprimir", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderPage();
    await within(await screen.findByRole("region", { name: "Vendas por pessoa" })).findByText(/Bruno/);

    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gerar PDF" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Gerar PDF" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll("div[class*='notPrinted']")).toHaveLength(0);
    print.mockRestore();
  });
});
