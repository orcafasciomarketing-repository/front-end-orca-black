import { describe, expect, it } from "vitest";

import { getPermissions } from "./permissions";

describe("getPermissions", () => {
  it("admin vê tudo: sem setor fixo", () => {
    expect(getPermissions("admin")).toEqual({ role: "admin", isAdmin: true, segment: "" });
  });

  it("b2b e b2g ficam presos no próprio setor e não são admin", () => {
    expect(getPermissions("b2b")).toEqual({ role: "b2b", isAdmin: false, segment: "B2B" });
    expect(getPermissions("b2g")).toEqual({ role: "b2g", isAdmin: false, segment: "B2G" });
  });

  it("sem perfil (usuário antigo ou backend sem perfis) continua admin, como antes", () => {
    expect(getPermissions(undefined)).toEqual({ role: "admin", isAdmin: true, segment: "" });
    expect(getPermissions("qualquer")).toEqual({ role: "admin", isAdmin: true, segment: "" });
  });
});
