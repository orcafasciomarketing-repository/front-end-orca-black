import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSales, getGoal } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import GoalWidget from "./GoalWidget";

vi.mock("../../api/slidesApi", () => ({
  getGoal: vi.fn(),
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
}));
vi.mock("../../../../shared/errorLogger", () => ({
  reportError: vi.fn(),
}));

const makeSale = (overrides) => ({
  _id: Math.random().toString(),
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  sdrIds: [],
  ...overrides,
});

const itemsOf = (groupName) =>
  within(screen.getByRole("region", { name: groupName }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("GoalWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSales.mockResolvedValue({ sales: [], total: 0 });
  });

  it("mostra o vendido, a meta, o percentual e quanto falta", async () => {
    getGoal.mockResolvedValue({ goal: 3000000, total: 212000, percent: 7.07 });

    renderWithQuery(<GoalWidget />);

    expect(await screen.findByText("7,07%")).toBeInTheDocument();
    expect(screen.getByText(/212\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/de R\$\s3\.000\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/Faltam R\$\s2\.788\.000,00/)).toBeInTheDocument();

    const bar = screen.getByRole("progressbar", { name: "Progresso da meta" });
    expect(bar).toHaveAttribute("aria-valuenow", "7.07");
    expect(bar.firstChild).toHaveStyle({ width: "7.07%" });
  });

  it("limita a barra em 100% e avisa quando a meta é batida", async () => {
    getGoal.mockResolvedValue({ goal: 400, total: 600, percent: 150 });

    renderWithQuery(<GoalWidget />);

    expect(await screen.findByText("Meta batida!")).toBeInTheDocument();
    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("progressbar").firstChild).toHaveStyle({ width: "100%" });
  });

  it("lista vendas, passagens e renovações por setor, só das vendas ativas", async () => {
    getGoal.mockResolvedValue({ goal: 3000000, total: 212000, percent: 7.07 });
    getAdminSales.mockResolvedValue({
      sales: [
        makeSale({ segment: "b2b", sdrIds: [{ name: "Izabel", job: "SDR" }] }),
        makeSale({ segment: "b2g", sdrIds: [{ name: "Julia", job: "Suporte" }] }),
        makeSale({ segment: "b2b" }),
        makeSale({ funnelType: "farm", segment: "b2g", sdrIds: [{ name: "Caio", job: "CS" }] }),
        makeSale({ dealStatus: "cancelada", segment: "b2g", sdrIds: [{ name: "Izabel", job: "SDR" }] }),
      ],
      total: 5,
    });

    renderWithQuery(<GoalWidget />);

    await screen.findByRole("region", { name: "Vendas por setor" });
    expect(getAdminSales).toHaveBeenCalledWith("");
    expect(itemsOf("Vendas por setor")).toEqual(["B2B2", "B2G1"]);
    expect(itemsOf("Passagens por setor")).toEqual(["CS1", "SDR1", "Suporte1"]);
    expect(itemsOf("Renovações por setor")).toEqual(["B2G1"]);
  });

  it("avisa em cada grupo quando ainda não tem nada", async () => {
    getGoal.mockResolvedValue({ goal: 3000000, total: 0, percent: 0 });

    renderWithQuery(<GoalWidget />);

    expect(await screen.findByText("Nenhuma venda")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma passagem")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma renovação")).toBeInTheDocument();
  });

  describe("com setor selecionado", () => {
    // Só conta venda ativa com data (isActiveSale)
    const realizedAt = "2026-11-27T13:00:00.000Z";
    const sales = [
      makeSale({ segment: "b2b", value: 500000, realizedAt }),
      makeSale({ segment: "b2g", value: 250000, realizedAt }),
      makeSale({ segment: "b2g", value: 50000, dealStatus: "cancelada", realizedAt }),
    ];
    const goalWithSegments = {
      goal: 3000000,
      total: 750000,
      percent: 25,
      segments: {
        b2b: { goal: 2000000, total: 500000, percent: 25 },
        b2g: { goal: 1000000, total: 250000, percent: 25 },
      },
    };
    const textOf = () => document.body.textContent.replace(/\u00a0/g, " ");

    it("compara com a meta do setor e mostra quanto falta e a participação", async () => {
      getGoal.mockResolvedValue(goalWithSegments);
      getAdminSales.mockResolvedValue({ sales, total: sales.length });

      renderWithQuery(<GoalWidget segment="B2G" />);

      expect(await screen.findByText("25%")).toBeInTheDocument();
      expect(textOf()).toContain("R$ 250.000,00de R$ 1.000.000,00 (meta B2G)");
      expect(textOf()).toContain("Faltam R$ 750.000,00 · B2G representa 33,3% do total vendido");
    });

    it("quem só vê o próprio setor (b2b/b2g) não vê a participação de 100%", async () => {
      const onlyB2b = sales.filter((sale) => sale.segment === "b2b");
      getGoal.mockResolvedValue(goalWithSegments);
      getAdminSales.mockResolvedValue({ sales: onlyB2b, total: onlyB2b.length });

      renderWithQuery(<GoalWidget segment="B2B" />);

      expect(await screen.findByText("25%")).toBeInTheDocument();
      expect(textOf()).toContain("de R$ 2.000.000,00 (meta B2B)");
      expect(textOf()).toContain("Faltam R$ 1.500.000,00");
      expect(textOf()).not.toContain("representa");
    });

    it("meta do setor batida", async () => {
      getGoal.mockResolvedValue(goalWithSegments);
      getAdminSales.mockResolvedValue({ sales: [makeSale({ segment: "b2g", value: 1200000, realizedAt })], total: 1 });

      renderWithQuery(<GoalWidget segment="B2G" />);

      expect(await screen.findByText("Meta batida!")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    });

    it("backend sem meta por setor: continua contra a meta total, como antes", async () => {
      getGoal.mockResolvedValue({ goal: 3000000, total: 750000, percent: 25 });
      getAdminSales.mockResolvedValue({ sales, total: sales.length });

      renderWithQuery(<GoalWidget segment="B2G" />);

      expect(await screen.findByText(/B2G representa 33,3% do total vendido/)).toBeInTheDocument();
      expect(textOf()).toContain("de R$ 3.000.000,00 (meta total)");
      expect(textOf()).not.toContain("Faltam");
    });
  });
});
