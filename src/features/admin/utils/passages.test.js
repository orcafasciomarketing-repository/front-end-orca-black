import { describe, expect, it } from "vitest";

import { formatPassageNames, getPassagePeople } from "./passages";

describe("passages", () => {
  it("devolve a lista de pessoas da passagem", () => {
    const sale = { sdrIds: [{ name: "Juliana" }, { name: "Rafael" }] };

    expect(getPassagePeople(sale)).toEqual([{ name: "Juliana" }, { name: "Rafael" }]);
    expect(formatPassageNames(sale)).toBe("Juliana, Rafael");
  });

  it("lista vazia é venda sem passagem", () => {
    expect(getPassagePeople({ sdrIds: [] })).toEqual([]);
    expect(formatPassageNames({ sdrIds: [] })).toBe("");
  });

  it("ignora pessoas que não vieram populadas (cadastro apagado)", () => {
    expect(formatPassageNames({ sdrIds: [null, { name: "Juliana" }] })).toBe("Juliana");
  });

  it("aceita venda antiga com um 'sdrId' só", () => {
    expect(formatPassageNames({ sdrId: { name: "Juliana" } })).toBe("Juliana");
    expect(getPassagePeople({})).toEqual([]);
  });
});
