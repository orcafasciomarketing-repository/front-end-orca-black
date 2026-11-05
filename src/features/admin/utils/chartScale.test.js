import { describe, expect, it } from "vitest";

import { formatCompactCurrency, formatPassages, niceTicks } from "./chartScale";

describe("chartScale", () => {
  it("niceTicks começa em 0 e termina num número redondo acima do máximo", () => {
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(101)).toEqual([0, 50, 100, 150]);
    expect(niceTicks(3000000)).toEqual([0, 1000000, 2000000, 3000000]);
  });

  it("niceTicks sem valor devolve uma escala mínima", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it("formatCompactCurrency abrevia em mil, mi e bi, sem casa decimal quando o número é redondo", () => {
    expect(formatCompactCurrency(0)).toBe("R$ 0");
    expect(formatCompactCurrency(750)).toBe("R$ 750");
    expect(formatCompactCurrency(25000)).toBe("R$ 25 mil");
    expect(formatCompactCurrency(212500)).toBe("R$ 212,5 mil");
    expect(formatCompactCurrency(2500000)).toBe("R$ 2,5 mi");
    expect(formatCompactCurrency(3000000)).toBe("R$ 3 mi");
    expect(formatCompactCurrency(1200000000)).toBe("R$ 1,2 bi");
  });

  it("formatPassages usa o singular com 1", () => {
    expect(formatPassages(1)).toBe("1 passagem");
    expect(formatPassages(3)).toBe("3 passagens");
  });
});
