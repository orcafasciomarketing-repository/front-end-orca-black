import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSales, getVendors } from "../api/slidesApi";
import { downloadFile } from "../utils/downloadFile";
import AdminPanel from "./AdminPanel";

vi.mock("../api/slidesApi", () => ({
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
}));
vi.mock("../utils/downloadFile", () => ({
  downloadFile: vi.fn(),
}));
vi.mock("../components/RankWidget/RankWidget", () => ({
  default: () => <p>Rank</p>,
}));
vi.mock("../components/SdrRankWidget/SdrRankWidget", () => ({
  default: () => <p>Rank das passagens</p>,
}));
vi.mock("../../../shared/errorLogger", () => ({
  reportError: vi.fn(),
}));

const bruno = { _id: "v1", vendorName: "Bruno" };
const carla = { _id: "v2", vendorName: "Carla" };

const makeSale = (id, vendor, realizedAt) => ({
  _id: id,
  rdDealId: `rd-${id}`,
  rdDealName: `Negócio ${id}`,
  dealStatus: "ativa",
  value: 1000,
  funnelType: "sales",
  segment: "b2b",
  vendorId: vendor,
  sdrIds: [],
  realizedAt,
});

const allSales = [
  makeSale("a", bruno, "2026-10-20T12:00:00.000Z"),
  makeSale("b", carla, "2026-10-14T12:00:00.000Z"),
  makeSale("c", carla, "2026-10-21T12:00:00.000Z"),
];

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminPanel />
    </QueryClientProvider>,
  );

const vendorSelect = () => screen.getByRole("combobox", { name: "Filtrar por vendedor" });
const weekSelect = () => screen.getByRole("combobox", { name: "Filtrar por semana" });
const optionsOf = (select) => within(select).getAllByRole("option").map((option) => option.textContent);

const waitForFilters = async () => {
  await waitFor(() => expect(within(vendorSelect()).getAllByRole("option")).toHaveLength(3));
  await waitFor(() => expect(within(weekSelect()).getAllByRole("option")).toHaveLength(5));
};

const exportAndGetCsv = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
  await waitFor(() => expect(downloadFile).toHaveBeenCalled());

  return { csv: downloadFile.mock.lastCall[0], fileName: downloadFile.mock.lastCall[1] };
};

const visibleSales = () => ["a", "b", "c"].filter((id) => screen.queryByText(`Negócio ${id}`));

describe("AdminPanel › filtros e exportação de vendas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T15:00:00.000Z"));
    getVendors.mockResolvedValue([carla, bruno]);
    getAdminSales.mockImplementation(async (vendorId) => {
      const sales = vendorId ? allSales.filter((sale) => sale.vendorId._id === vendorId) : allSales;
      return { sales, total: sales.length };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lista os vendedores em ordem alfabética e todas as semanas do mês até a atual", async () => {
    renderPanel();
    await waitForFilters();

    expect(optionsOf(vendorSelect())).toEqual(["Todos", "Bruno", "Carla"]);
    expect(optionsOf(weekSelect())).toEqual([
      "Todas as semanas",
      "Semana atual (19/10 a 25/10)",
      "Semana passada (12/10 a 18/10)",
      "05/10 a 11/10",
      "28/09 a 04/10",
    ]);
  });

  it("filtra por uma semana de duas semanas atrás", async () => {
    allSales.push(makeSale("d", bruno, "2026-10-07T12:00:00.000Z"));
    renderPanel();
    await waitForFilters();
    fireEvent.change(weekSelect(), { target: { value: "2026-10-05" } });

    await waitFor(() => expect(screen.queryByText("Negócio d")).toBeInTheDocument());
    expect(visibleSales()).toEqual([]);

    const { csv, fileName } = await exportAndGetCsv();
    expect(csv).toContain("Negócio d");
    expect(fileName).toBe("vendas-todos-semana-2026-10-05-2026-10-22.csv");
    allSales.pop();
  });

  it("mostra vendedor sem nome no filtro em vez de esvaziar a lista", async () => {
    getVendors.mockResolvedValue([carla, { _id: "v3" }, bruno]);
    renderPanel();

    await waitFor(() => expect(within(vendorSelect()).getAllByRole("option")).toHaveLength(4));
    expect(optionsOf(vendorSelect())).toEqual(["Todos", "Bruno", "Carla", "Vendedor sem nome"]);
  });

  it("avisa no filtro quando não consegue carregar os vendedores", async () => {
    getVendors.mockRejectedValue(new Error("offline"));
    renderPanel();

    expect(await screen.findByText("Não foi possível carregar os vendedores")).toBeInTheDocument();
  });

  it("sem filtros mostra e exporta tudo", async () => {
    renderPanel();
    await screen.findByText("Negócio a");

    expect(visibleSales()).toEqual(["a", "b", "c"]);

    const { csv, fileName } = await exportAndGetCsv();
    expect(csv).toContain("Negócio a");
    expect(csv).toContain("Negócio b");
    expect(csv).toContain("Negócio c");
    expect(fileName).toBe("vendas-todos-2026-10-22.csv");
  });

  it("só o vendedor: mostra e exporta só as vendas dele", async () => {
    renderPanel();
    await waitForFilters();
    fireEvent.change(vendorSelect(), { target: { value: "v2" } });

    await waitFor(() => expect(visibleSales()).toEqual(["b", "c"]));
    expect(getAdminSales).toHaveBeenCalledWith("v2");

    const { csv, fileName } = await exportAndGetCsv();
    expect(csv).not.toContain("Negócio a");
    expect(csv).toContain("Negócio b");
    expect(csv).toContain("Negócio c");
    expect(fileName).toBe("vendas-carla-2026-10-22.csv");
  });

  it("só a semana: mostra e exporta só as vendas daquela semana, de todos os vendedores", async () => {
    renderPanel();
    await waitForFilters();
    fireEvent.change(weekSelect(), { target: { value: "2026-10-19" } });

    await waitFor(() => expect(visibleSales()).toEqual(["a", "c"]));
    expect(screen.getByText("2")).toBeInTheDocument();

    const { csv, fileName } = await exportAndGetCsv();
    expect(csv).toContain("Negócio a");
    expect(csv).not.toContain("Negócio b");
    expect(csv).toContain("Negócio c");
    expect(fileName).toBe("vendas-todos-semana-2026-10-19-2026-10-22.csv");
  });

  it("semana + vendedor: mostra e exporta só as vendas dele naquela semana", async () => {
    renderPanel();
    await waitForFilters();
    fireEvent.change(weekSelect(), { target: { value: "2026-10-12" } });
    fireEvent.change(vendorSelect(), { target: { value: "v2" } });

    await waitFor(() => expect(visibleSales()).toEqual(["b"]));

    const { csv, fileName } = await exportAndGetCsv();
    expect(csv).toContain("Negócio b");
    expect(csv).not.toContain("Negócio a");
    expect(csv).not.toContain("Negócio c");
    expect(fileName).toBe("vendas-carla-semana-2026-10-12-2026-10-22.csv");
  });

  it("semana sem vendas do vendedor mostra a lista vazia", async () => {
    renderPanel();
    await waitForFilters();
    fireEvent.change(weekSelect(), { target: { value: "2026-10-12" } });
    fireEvent.change(vendorSelect(), { target: { value: "v1" } });

    expect(await screen.findByText("Nenhuma venda encontrada")).toBeInTheDocument();
  });

  it("voltar para 'Todas as semanas' e 'Todos' mostra e exporta tudo de novo", async () => {
    renderPanel();
    await waitForFilters();
    fireEvent.change(weekSelect(), { target: { value: "2026-10-12" } });
    fireEvent.change(vendorSelect(), { target: { value: "v2" } });
    await waitFor(() => expect(visibleSales()).toEqual(["b"]));

    fireEvent.change(weekSelect(), { target: { value: "" } });
    fireEvent.change(vendorSelect(), { target: { value: "" } });

    await waitFor(() => expect(visibleSales()).toEqual(["a", "b", "c"]));
    const { fileName } = await exportAndGetCsv();
    expect(fileName).toBe("vendas-todos-2026-10-22.csv");
  });

  it("avisa quando a exportação falha", async () => {
    renderPanel();
    await screen.findByText("Negócio a");
    getAdminSales.mockRejectedValue(new Error("offline"));

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(await screen.findByText("Não foi possível exportar")).toBeInTheDocument();
    expect(downloadFile).not.toHaveBeenCalled();
  });
});
