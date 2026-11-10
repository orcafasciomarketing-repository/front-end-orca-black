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

  it("/analytics/people-points devolve todas as pessoas com o time e os pontos, como o backend", () => {
    const data = get("/analytics/people-points").data.data;
    const person = (name) => data.people.find((item) => item.name === name);

    expect(data.period).toBe("all");
    expect(data.teams.map((team) => team.teamName)).toEqual(["Orçawinx", "Sem freio", "Wizards of sales"]);
    expect(data.people).toHaveLength(15);
    expect(person("Gustavo Rocha")).toEqual(
      expect.objectContaining({ kind: "vendor", teamId: "team-orcawinx", sales: 6, farm: 0, passage: 0, total: 6 }),
    );
    expect(person("Caio Martins")).toEqual(expect.objectContaining({ kind: "sdr", passage: 3, total: 3 }));
    expect(data.people.map((item) => item.total)).toEqual([...data.people.map((item) => item.total)].sort((a, b) => b - a));

    const scoreboard = get("/analytics/scoreboard").data.data;
    for (const team of scoreboard) {
      const sum = data.people.filter((item) => item.teamId === team.teamId).reduce((total, item) => total + item.total, 0);
      expect(sum).toBe(team.total);
    }
  });

  it("/analytics/people-points respeita period, segment e from/to", () => {
    const total = (params, name) =>
      get("/analytics/people-points", params).data.data.people.find((item) => item.name === name).total;

    expect(total({ segment: "b2b" }, "Gustavo Rocha")).toBe(0);
    expect(total({ period: "week" }, "Gustavo Rocha")).toBe(2);
    expect(total({ from: "2026-10-21", to: "2026-10-21" }, "Brenda Lima")).toBeGreaterThan(0);
    expect(total({ from: "2026-12-01" }, "Brenda Lima")).toBe(0);
  });

  it("/me, /me/sales e /me/team respondem como a área do colaborador do backend (Brenda Lima)", () => {
    const me = get("/me").data.data;
    const sales = get("/me/sales").data.data;
    const team = get("/me/team").data.data;

    expect(me).toEqual(expect.objectContaining({ kind: "vendor", name: "Brenda Lima" }));
    expect(me.team.teamName).toBe("Wizards of sales");
    expect(sales.total).toBe(sales.data.length);
    expect(sales.data.every((sale) => sale.vendorId._id === "vendor-brenda")).toBe(true);
    expect(team.teams.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(team.people.every((person) => !("value" in person))).toBe(true);
    expect(team.people.filter((person) => person.isMe).map((person) => person.name)).toEqual(["Brenda Lima"]);
    expect(team.people.reduce((sum, person) => sum + person.total, 0)).toBe(team.team.total);
    expect(get("/me/team", { period: "lastWeek" }).data.data.period).toBe("lastWeek");
  });

  it("/me/prizes devolve os pontos e os prêmios retirados da Brenda, iguais aos de /prizes", () => {
    const mine = get("/me/prizes").data.data;
    const brenda = get("/prizes").data.data.people.find((person) => person.personId === "vendor-brenda");

    expect(mine.accumulated).toBe(brenda.accumulated);
    expect(mine.withdrawn).toBe(1);
    expect(mine.balance).toBe(brenda.balance);
  });

  it("/goals/:mes e /goals/:mes/progress respondem como o backend; só o mês atual tem metas", () => {
    const month = get("/goals/2026-10").data.data;
    const progress = get("/goals/2026-10/progress").data.data;

    expect(month.weeks).toHaveLength(4);
    expect(month.segments.b2b.config.people.every((person) => person.weeks.length === 4)).toBe(true);
    expect(month.segments.b2g.vendors.every((vendor) => vendor.job.startsWith("B2G"))).toBe(true);
    expect(progress.segments.map((item) => item.segment)).toEqual(["b2b", "b2g"]);
    expect(progress.summary.people).toBe(progress.people.length);
    expect(get("/goals/2026-09").data.data.segments.b2b.config).toBeNull();
    expect(get("/goals/2026-09/progress").data.data.people).toEqual([]);
    expect(progress.total.month.tiers.goal).toBe(
      progress.segments.reduce((sum, item) => sum + item.month.tiers.goal, 0),
    );
    expect(Object.keys(progress.total.forecast.tiers)).toEqual(["goal", "super", "black"]);
    expect(progress.people[0].forecast.trajectory.realistic).toHaveLength(progress.days.length);
  });

  it("/goals/:mes/history traz os 6 meses até o escolhido; só o mês atual tem faixas", () => {
    const history = get("/goals/2026-10/history").data.data;

    expect(history.months.map((item) => item.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(history.months.at(-1).total.tiers.goal).toBeGreaterThan(0);
    expect(history.months[0].total.tiers).toBeNull();
    expect(history.months.at(-1).people.length).toBeGreaterThan(0);
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
