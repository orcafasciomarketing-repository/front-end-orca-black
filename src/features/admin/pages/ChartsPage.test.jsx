import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSales, getGoal, getTeams } from "../api/slidesApi";
import ChartsPage from "./ChartsPage";

vi.mock("../api/slidesApi", () => ({
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
  getGoal: vi.fn(),
  getTeams: vi.fn(),
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sem vendas, cada gráfico avisa que não tem dados", async () => {
    getAdminSales.mockResolvedValue({ sales: [], total: 0 });

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Nenhuma venda no período")).toHaveLength(4));
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
});
