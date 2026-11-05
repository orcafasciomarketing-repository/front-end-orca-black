import { describe, expect, it } from "vitest";

import { formatPassages, niceTicks } from "./chartScale";

describe("chartScale", () => {
  it("niceTicks começa em 0 e termina num número redondo acima do máximo", () => {
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(101)).toEqual([0, 50, 100, 150]);
    expect(niceTicks(3000000)).toEqual([0, 1000000, 2000000, 3000000]);
  });

  it("niceTicks sem valor devolve uma escala mínima", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it("formatPassages usa o singular com 1", () => {
    expect(formatPassages(1)).toBe("1 passagem");
    expect(formatPassages(3)).toBe("3 passagens");
  });
});
