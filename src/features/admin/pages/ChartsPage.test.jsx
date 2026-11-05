import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSales, getGoal, getTeams } from "../api/slidesApi";
import { downloadFile } from "../utils/downloadFile";
import ChartsPage from "./ChartsPage";

vi.mock("../api/slidesApi", () => ({
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
  getGoal: vi.fn(),
  getTeams: vi.fn(),
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
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("sem vendas, cada gráfico avisa que não tem dados", async () => {
    getAdminSales.mockResolvedValue({ sales: [], total: 0 });

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Nenhuma venda no período")).toHaveLength(10));
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

  it("o modo escuro liga, desliga e fica salvo", async () => {
    const { unmount } = renderPage();

    const toggle = screen.getByRole("button", { name: "Modo escuro" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("admin-charts-theme")).toBe("dark");

    unmount();
    renderPage();
    expect(screen.getByRole("button", { name: "Modo escuro" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));
    expect(localStorage.getItem("admin-charts-theme")).toBe("light");
  });

  it("previsão de fechamento mostra o ritmo necessário até o fim da campanha", async () => {
    renderPage();

    const card = await screen.findByRole("region", {
      name: "Previsão de fechamento",
    });
    await waitFor(() => expect(card.textContent.replace(/\u00a0/g, " ")).toContain("Dias restantes até 01/1240"));
    expect(card.textContent.replace(/\u00a0/g, " ")).toContain("Ritmo necessário por diaR$ 74.975,00");
  });
});
