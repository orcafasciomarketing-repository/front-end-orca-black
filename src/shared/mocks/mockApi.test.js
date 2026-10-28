import { describe, expect, it } from "vitest";

import { mockApi, resolveMockRequest, subscribeToMockSalesEvents } from "./mockApi";

const now = new Date("2026-10-21T15:00:00.000Z");
const get = (url, params) => resolveMockRequest(url, params, now);

describe("mockApi", () => {
  it("responde no envelope do backend { success, data, message }", () => {
    const response = get("/analytics/goal");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true, data: expect.any(Object), message: expect.any(String) });
  });

  it("/analytics/ranking devolve { vendor: [...] } e respeita period e vendorDepartment", () => {
    const week = get("/analytics/ranking", { period: "week", vendorDepartment: "sales" }).data.data;
    const all = get("/analytics/ranking", { period: "all", vendorDepartment: "sales" }).data.data;
    const farm = get("/analytics/ranking", { period: "week", vendorDepartment: "farm" }).data.data;

    expect(week.vendor[0]).toEqual(expect.objectContaining({ vendorId: "vendor-brenda", points: 4 }));
    expect(all.vendor[0]).toEqual(expect.objectContaining({ vendorId: "vendor-gustavo", points: 6 }));
    expect(farm.vendor.every((vendor) => vendor.points === 1)).toBe(true);
  });

  it("como o backend, period inválido vira 'all' e vendorDepartment inválido vira 'sales'", () => {
    const invalid = get("/analytics/ranking", { period: "qualquer", vendorDepartment: "x" }).data.data;
    const all = get("/analytics/ranking", { period: "all", vendorDepartment: "sales" }).data.data;

    expect(invalid).toEqual(all);
  });

  it("rotas /last-week devolvem a semana passada", () => {
    expect(get("/analytics/scoreboard/last-week").data.data[0]).toEqual(expect.objectContaining({ teamName: "Orçawinx", total: 8 }));
    expect(get("/analytics/ranking/last-week").data.data.vendor[0]).toEqual(expect.objectContaining({ name: "Gustavo Rocha" }));
    expect(get("/analytics/sdr-ranking/last-week").data.data).toHaveLength(3);
  });

  it("/sdr-ranking devolve a lista direta, sem objeto em volta", () => {
    expect(Array.isArray(get("/analytics/sdr-ranking", { period: "all" }).data.data)).toBe(true);
  });

  it("/sales/admin, /sales/get e /sales/get/:vendorId devolvem { data, total }", () => {
    expect(get("/sales/admin").data.data.total).toBe(18);
    expect(get("/sales/get").data.data.total).toBe(6);
    expect(get("/sales/get/vendor-karine").data.data.total).toBe(2);
  });

  it("/vendor/list e /sdr/list devolvem os cadastros", () => {
    expect(get("/vendor/list").data.data).toHaveLength(11);
    expect(get("/sdr/list").data.data).toHaveLength(4);
  });

  it("rota que não existe devolve 404", () => {
    expect(get("/nao-existe").status).toBe(404);
  });

  it("mockApi.get rejeita com o status, como o axios", async () => {
    await expect(mockApi.get("/nao-existe")).rejects.toThrow("Request failed with status code 404");
  });

  it("o SSE dos mocks não manda nada (nenhuma venda nova com o tempo)", () => {
    let received = 0;
    const unsubscribe = subscribeToMockSalesEvents(() => {
      received += 1;
    });

    unsubscribe();

    expect(received).toBe(0);
  });
});
