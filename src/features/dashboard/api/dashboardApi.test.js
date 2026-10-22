import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import {
  SALE_VIDEO_URL,
  checkSaleVideo,
  getGoal,
  getScoreboard,
  getSdrRanking,
  getVendorRanking,
  subscribeToSalesEvents,
  toNewSale,
} from "./dashboardApi";
import { goalMock } from "./dashboardMocks";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { get: vi.fn() },
}));

const envelope = (data) => ({ data: { success: true, data } });

describe("dashboardApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("getGoal devolve só o data do envelope", async () => {
    const goal = { goal: 500000, total: 125000, percent: 25 };
    api.get.mockResolvedValue(envelope(goal));

    await expect(getGoal()).resolves.toEqual(goal);
    expect(api.get).toHaveBeenCalledWith("/analytics/goal");
  });

  it("getScoreboard envia o period e acrescenta o id a partir do teamId", async () => {
    api.get.mockResolvedValue(envelope([{ teamId: "t1", total: 10 }]));

    await expect(getScoreboard("week")).resolves.toEqual([{ teamId: "t1", total: 10, id: "t1" }]);
    expect(api.get).toHaveBeenCalledWith("/analytics/scoreboard", { params: { period: "week" } });
  });

  it("getVendorRanking envia period e vendorDepartment e tira a lista de dentro de vendor", async () => {
    api.get.mockResolvedValue(envelope({ vendor: [{ vendorId: "v1", name: "Bruno", points: 17 }] }));

    await expect(getVendorRanking("all", "farm")).resolves.toEqual([
      { vendorId: "v1", name: "Bruno", points: 17, id: "v1" },
    ]);
    expect(api.get).toHaveBeenCalledWith("/analytics/ranking", {
      params: { period: "all", vendorDepartment: "farm" },
    });
  });

  it("getSdrRanking envia o period e acrescenta o id a partir do sdrId", async () => {
    api.get.mockResolvedValue(envelope([{ sdrId: "s1", name: "Juliana", points: 4 }]));

    await expect(getSdrRanking("week")).resolves.toEqual([{ sdrId: "s1", name: "Juliana", points: 4, id: "s1" }]);
    expect(api.get).toHaveBeenCalledWith("/analytics/sdr-ranking", { params: { period: "week" } });
  });

  it("com VITE_USE_MOCKS=true devolve os mocks sem chamar o backend", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");

    await expect(getGoal()).resolves.toEqual(goalMock);

    const teams = await getScoreboard("week");
    const vendors = await getVendorRanking("week", "sales");
    const sdrs = await getSdrRanking("all");

    expect(teams).toHaveLength(3);
    expect(vendors).toHaveLength(3);
    expect(sdrs).toHaveLength(3);
    expect([...teams, ...vendors, ...sdrs].every((item) => item.id)).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("toNewSale traduz o evento de venda nova para o formato do popup", () => {
    const event = {
      sale: { _id: "s1", sdrId: "sdr1", funnelType: "sales" },
      vendor: { vendorName: "Bruno", job: "Vendedor", imageUrl: "bruno.png" },
      sdr: { name: "Juliana", job: "SDR", imageUrl: "juliana.png" },
    };

    expect(toNewSale(event)).toEqual({
      id: "s1",
      type: "sales",
      seller: { name: "Bruno", job: "Vendedor", imageUrl: "bruno.png" },
      assist: { name: "Juliana", job: "SDR", imageUrl: "juliana.png" },
    });
  });

  it("toNewSale marca a venda farmer como renovação", () => {
    const event = { sale: { _id: "s1", funnelType: "farm" }, vendor: { vendorName: "Bruno" } };

    expect(toNewSale(event).type).toBe("farm");
  });

  it("checkSaleVideo devolve a URL quando o arquivo existe e é um vídeo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "video/mp4" }) }));

    await expect(checkSaleVideo()).resolves.toBe(SALE_VIDEO_URL);
    expect(fetch).toHaveBeenCalledWith(SALE_VIDEO_URL, { method: "HEAD" });
  });

  it("checkSaleVideo devolve null quando o servidor responde outra coisa (arquivo não existe)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "text/html" }) }));

    await expect(checkSaleVideo()).resolves.toBeNull();
  });

  it("checkSaleVideo devolve null quando a requisição falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(checkSaleVideo()).resolves.toBeNull();
  });

  it("toNewSale deixa a assistência vazia quando a venda não tem passagem", () => {
    const event = { sale: { _id: "s1" }, vendor: { vendorName: "Bruno" } };

    expect(toNewSale(event).assist).toBeNull();
  });

  it("toNewSale devolve null para evento que não é venda nova", () => {
    expect(toNewSale({ type: "sale-canceled" })).toBeNull();
    expect(toNewSale(null)).toBeNull();
  });

  it("subscribeToSalesEvents repassa cada evento do SSE e fecha a conexão", () => {
    const instances = [];
    vi.stubGlobal(
      "EventSource",
      class {
        constructor(url) {
          this.url = url;
          this.close = vi.fn();
          instances.push(this);
        }
      },
    );
    vi.stubEnv("VITE_API_URL", "http://api.test");
    const onEvent = vi.fn();

    const unsubscribe = subscribeToSalesEvents(onEvent);
    const [eventSource] = instances;
    eventSource.onmessage({ data: JSON.stringify({ type: "sale-canceled" }) });
    eventSource.onmessage({ data: JSON.stringify({ sale: { _id: "s1" }, vendor: { vendorName: "Bruno" } }) });
    unsubscribe();

    expect(eventSource.url).toBe("http://api.test/sales/events");
    expect(onEvent).toHaveBeenNthCalledWith(1, null);
    expect(onEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: "s1" }));
    expect(eventSource.close).toHaveBeenCalled();
  });
});
