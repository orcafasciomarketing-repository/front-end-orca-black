import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSales, getRankVendors } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import RankWidget from "./RankWidget";

vi.mock("../../api/slidesApi", () => ({
  getRankVendors: vi.fn(),
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
}));

const salesFor = (segment) => [
  {
    _id: "a",
    dealStatus: "ativa",
    funnelType: "sales",
    segment,
    value: 1000,
    realizedAt: "2026-10-20T15:00:00.000Z",
    vendorId: { _id: "v9", vendorName: "Zeca", job: "B2G Sales" },
    sdrIds: [{ _id: "s9", name: "Paula", job: "SDR" }],
  },
  {
    _id: "b",
    dealStatus: "ativa",
    funnelType: "farm",
    segment,
    value: 500,
    realizedAt: "2026-10-20T16:00:00.000Z",
    vendorId: { _id: "v8", vendorName: "Yara", job: "B2G Farmer" },
    sdrIds: [],
  },
];

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

  it("com um setor, monta o ranking a partir das vendas daquele setor", async () => {
    getAdminSales.mockResolvedValue({
      sales: [
        ...salesFor("b2g"),
        ...salesFor("b2b").map((sale) => ({
          ...sale,
          _id: `x${sale._id}`,
          vendorId: { _id: "v7", vendorName: "Xico", job: "B2B Sales" },
        })),
      ],
      total: 4,
    });

    renderWithQuery(<RankWidget segment="B2G" />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(getRankVendors).not.toHaveBeenCalled();
    expect(items.map((item) => item.textContent)).toEqual(["1ºZecaB2G Sales3 pontos"]);

    fireEvent.click(screen.getByRole("tab", { name: "Renovação" }));
    expect(await screen.findByText("Yara")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("1ºYaraB2G Farmer2 pontos");
  });
});
