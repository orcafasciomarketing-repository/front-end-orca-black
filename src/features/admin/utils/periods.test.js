import { describe, expect, it } from "vitest";

import { comparisonLabel, filterSalesByPeriod, periodFileSuffix, previousPeriod, resolvePeriod } from "./periods";

const now = new Date("2026-10-22T15:00:00.000Z");

const resolve = (value, from = "", to = "") => resolvePeriod({ value, from, to }, now);

describe("periods", () => {
  it("sem escolha não filtra nada", () => {
    expect(resolve("")).toBeNull();
  });

  it("últimos N dias terminam hoje e contam hoje", () => {
    expect(resolve("last-3")).toMatchObject({ start: "2026-10-20", end: "2026-10-22", label: "Últimos 3 dias" });
    expect(resolve("last-7")).toMatchObject({ start: "2026-10-16", end: "2026-10-22" });
    expect(resolve("last-30")).toMatchObject({ start: "2026-09-23", end: "2026-10-22" });
  });

  it("este mês vai do dia 1º até hoje", () => {
    expect(resolve("month")).toMatchObject({ start: "2026-10-01", end: "2026-10-22", label: "Este mês" });
  });

  it("uma semana vai de segunda a domingo, com o nome da semana", () => {
    expect(resolve("2026-10-12")).toMatchObject({
      type: "week",
      start: "2026-10-12",
      end: "2026-10-18",
      label: "Semana passada (12/10 a 18/10)",
    });
  });

  it("período específico usa as datas escolhidas, inverte se vierem trocadas e sem fim vai até hoje", () => {
    expect(resolve("custom", "2026-10-01", "2026-10-10")).toMatchObject({
      start: "2026-10-01",
      end: "2026-10-10",
      label: "01/10 a 10/10",
    });
    expect(resolve("custom", "2026-10-10", "2026-10-01")).toMatchObject({ start: "2026-10-01", end: "2026-10-10" });
    expect(resolve("custom", "2026-10-15")).toMatchObject({ start: "2026-10-15", end: "2026-10-22" });
    expect(resolve("custom")).toBeNull();
  });

  it("filtra pelo dia de São Paulo, incluindo o primeiro e o último dia", () => {
    const sales = [
      { _id: "antes", realizedAt: "2026-10-20T02:59:00.000Z" },
      { _id: "inicio", realizedAt: "2026-10-20T03:00:00.000Z" },
      { _id: "fim", realizedAt: "2026-10-23T02:59:00.000Z" },
      { _id: "depois", realizedAt: "2026-10-23T03:00:00.000Z" },
      { _id: "sem-data", realizedAt: null },
    ];

    expect(filterSalesByPeriod(sales, resolve("last-3")).map((sale) => sale._id)).toEqual(["inicio", "fim"]);
    expect(filterSalesByPeriod(sales, null)).toBe(sales);
  });

  it("o período anterior tem o mesmo tamanho e termina na véspera", () => {
    expect(previousPeriod(resolve("last-7"))).toMatchObject({ start: "2026-10-09", end: "2026-10-15" });
    expect(previousPeriod(resolve("2026-10-19"))).toMatchObject({ start: "2026-10-12", end: "2026-10-18" });
  });

  it("nome da comparação e sufixo do arquivo", () => {
    expect(comparisonLabel(resolve("2026-10-19"))).toBe("semana anterior");
    expect(comparisonLabel(resolve("last-7"))).toBe("período anterior");
    expect(periodFileSuffix(resolve("2026-10-19"))).toBe("-semana-2026-10-19");
    expect(periodFileSuffix(resolve("last-3"))).toBe("-2026-10-20-a-2026-10-22");
    expect(periodFileSuffix(null)).toBe("");
  });
});
