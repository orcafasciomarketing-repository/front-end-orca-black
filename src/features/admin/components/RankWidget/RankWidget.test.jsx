import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRankVendors } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import RankWidget from "./RankWidget";

vi.mock("../../api/slidesApi", () => ({
  getRankVendors: vi.fn(),
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
});
