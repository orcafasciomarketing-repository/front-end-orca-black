import { describe, expect, it } from "vitest";

import { formatCurrency } from "./formatCurrency";

const normalize = (text) => text.replace(/\s/g, " ");

describe("formatCurrency", () => {
  it("formata em reais no padrão pt-BR", () => {
    expect(normalize(formatCurrency(1500299.2))).toBe("R$ 1.500.299,20");
  });

  it("trata valor ausente como zero", () => {
    expect(normalize(formatCurrency(undefined))).toBe("R$ 0,00");
  });
});
