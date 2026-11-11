import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRankVendors } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import RankWidget from "./RankWidget";

vi.mock("../../api/slidesApi", () => ({
  getRankVendors: vi.fn(),
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
}));

const ranks = {
  sales: [
    { vendorId: "v1", name: "Bruno", job: "Vendedor", points: 9 },
    { vendorId: "v2", name: "Carla", job: "Vendedora", points: 1 },
  ],
  farm: [{ vendorId: "v3", name: "Eduardo", job: "Farmer", points: 4 }],
};

describe("RankWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRankVendors.mockImplementation(async (type) => ranks[type]);
  });

  it("abre na aba Vendas com posição, nome, cargo e pontos vindos do backend", async () => {
    renderWithQuery(<RankWidget />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(getRankVendors).toHaveBeenCalledWith("sales");
    expect(screen.getByRole("tab", { name: "Vendas" })).toHaveAttribute("aria-selected", "true");
    expect(items[0]).toHaveTextContent("1ºBrunoVendedor9 pontos");
    expect(items[1]).toHaveTextContent("2ºCarlaVendedora1 ponto");
  });

  it("a aba Renovação mostra o ranking de farm", async () => {
    renderWithQuery(<RankWidget />);
    await screen.findByText("Bruno");

    fireEvent.click(screen.getByRole("tab", { name: "Renovação" }));

    expect(await screen.findByText("Eduardo")).toBeInTheDocument();
    expect(getRankVendors).toHaveBeenCalledWith("farm");
    expect(screen.queryByText("Bruno")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Renovação" })).toHaveAttribute("aria-selected", "true");
  });

  it("avisa quando ninguém pontuou ainda", async () => {
    getRankVendors.mockResolvedValue([]);

    renderWithQuery(<RankWidget />);

    expect(await screen.findByText("Nenhuma venda pontuada ainda")).toBeInTheDocument();
  });

  it("com um setor, pede o ranking do setor ao backend", async () => {
    getRankVendors.mockResolvedValue([{ vendorId: "v9", name: "Zeca", job: "B2G Sales", points: 9 }]);

    renderWithQuery(<RankWidget segment="B2G" />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(getRankVendors).toHaveBeenCalledWith("sales", { period: "all", segment: "B2G", campaign: "" });
    expect(items.map((item) => item.textContent)).toEqual(["1ºZecaB2G Sales9 pontos"]);
  });

  it("período: campanha (padrão), esta semana com movimento e semana passada", async () => {
    getRankVendors.mockImplementation(async (type, options) => {
      if (options?.period === "week") {
        return [
          { vendorId: "v2", name: "Carla", job: "Vendedora", points: 6 },
          { vendorId: "v1", name: "Bruno", job: "Vendedor", points: 4 },
          { vendorId: "v4", name: "Dani", job: "Vendedora", points: 2 },
        ];
      }
      if (options?.period === "lastWeek") {
        return [
          { vendorId: "v1", name: "Bruno", job: "Vendedor", points: 8 },
          { vendorId: "v2", name: "Carla", job: "Vendedora", points: 5 },
        ];
      }
      return ranks[type];
    });
    renderWithQuery(<RankWidget />);

    const periods = screen.getByRole("group", { name: "Período do ranking de vendedores" });
    expect(within(periods).getByRole("button", { name: "Campanha" })).toHaveAttribute("aria-pressed", "true");
    await screen.findByText("Bruno");
    expect(getRankVendors).toHaveBeenCalledWith("sales");

    fireEvent.click(within(periods).getByRole("button", { name: "Esta semana" }));
    expect(await screen.findByText("Dani")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("subiu 1 posição desde a semana passada")).toBeInTheDocument();
    expect(within(items[1]).getByText("caiu 1 posição desde a semana passada")).toBeInTheDocument();
    expect(within(items[2]).getByText("não estava no top 3 da semana passada")).toBeInTheDocument();

    fireEvent.click(within(periods).getByRole("button", { name: "Semana passada" }));
    await waitFor(() => expect(screen.queryByText("Dani")).not.toBeInTheDocument());
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/desde a semana passada/)).not.toBeInTheDocument();
  });
});
