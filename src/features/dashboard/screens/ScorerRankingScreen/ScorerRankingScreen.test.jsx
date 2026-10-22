import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getVendorRanking } from "../../api/dashboardApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import ScorerRankingScreen from "./ScorerRankingScreen";

vi.mock("../../api/dashboardApi", () => ({
  getVendorRanking: vi.fn(),
}));

const makeVendor = (id, points) => ({ id, vendorId: id, name: `Vendedor ${id}`, points });

describe("ScorerRankingScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca o ranking do período e do tipo e ordena do maior para o menor", async () => {
    getVendorRanking.mockResolvedValue([makeVendor("b", 9), makeVendor("a", 17), makeVendor("c", 12)]);

    renderWithQuery(<ScorerRankingScreen period="week" department="farm" />);

    const cards = within(await screen.findByRole("list")).getAllByRole("listitem");

    expect(getVendorRanking).toHaveBeenCalledWith("week", "farm");
    expect(within(cards[0]).getByText("1º")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Vendedor a")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Vendedor c")).toBeInTheDocument();
    expect(within(cards[2]).getByText("3º")).toBeInTheDocument();
    expect(within(cards[2]).getByText("Vendedor b")).toBeInTheDocument();
  });

  it.each([
    ["week", "farm", "Farmer Semanal"],
    ["week", "sales", "Vendas Semanal"],
    ["all", "farm", "Farmer Geral"],
    ["all", "sales", "Vendas Geral"],
  ])("period=%s e department=%s mostram o subtítulo %s", async (period, department, subtitle) => {
    getVendorRanking.mockResolvedValue([makeVendor("a", 1)]);

    renderWithQuery(<ScorerRankingScreen period={period} department={department} />);

    expect(await screen.findByText(subtitle)).toBeInTheDocument();
  });

  it("avisa quando ninguém pontuou", async () => {
    getVendorRanking.mockResolvedValue([]);

    renderWithQuery(<ScorerRankingScreen period="week" department="sales" />);

    expect(await screen.findByText("Nenhuma venda no período")).toBeInTheDocument();
  });
});
