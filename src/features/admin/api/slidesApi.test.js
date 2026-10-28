import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import { getAdminSales, getRankVendors, getVendors } from "./slidesApi";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { get: vi.fn() },
}));

const salesResponse = {
  data: {
    success: true,
    data: {
      data: [
        { _id: "old", realizedAt: "2026-10-01T10:00:00.000Z" },
        { _id: "new", realizedAt: "2026-10-09T10:00:00.000Z" },
      ],
      total: 2,
    },
  },
};

describe("slidesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(salesResponse);
  });

  it("getAdminSales sem vendedor busca todas as vendas", async () => {
    await getAdminSales("");

    expect(api.get).toHaveBeenCalledWith("/sales/admin");
  });

  it("getAdminSales com vendedor busca só as vendas dele", async () => {
    await getAdminSales("vendor-1");

    expect(api.get).toHaveBeenCalledWith("/sales/get/vendor-1");
  });

  it("getAdminSales devolve as vendas da mais nova para a mais antiga e o total", async () => {
    const { sales, total } = await getAdminSales();

    expect(sales.map((sale) => sale._id)).toEqual(["new", "old"]);
    expect(total).toBe(2);
  });

  it("getVendors devolve a lista de vendedores", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [{ _id: "v1", vendorName: "Bruno" }] } });

    await expect(getVendors()).resolves.toEqual([{ _id: "v1", vendorName: "Bruno" }]);
    expect(api.get).toHaveBeenCalledWith("/vendor/list");
  });

  it("getRankVendors manda o tipo de venda e devolve a lista de dentro de vendor", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { vendor: [{ vendorId: "v1", name: "Bruno", points: 9 }] } } });

    await expect(getRankVendors("farm")).resolves.toEqual([{ vendorId: "v1", name: "Bruno", points: 9 }]);
    expect(api.get).toHaveBeenCalledWith("/analytics/ranking", { params: { vendorDepartment: "farm" } });
  });
});
