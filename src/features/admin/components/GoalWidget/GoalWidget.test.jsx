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
});
