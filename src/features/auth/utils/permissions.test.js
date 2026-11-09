import { describe, expect, it } from "vitest";

import { getPermissions } from "./permissions";

describe("getPermissions", () => {
  it("master faz tudo: importação, erros, usuários e todos os setores", () => {
    expect(getPermissions("master")).toEqual({
      role: "master",
      isMaster: true,
      canSeeUsers: true,
      segment: "",
      isPerson: false,
      canSeeAdmin: true,
      canSeeGoals: true,
    });
  });

  it("admin vê todos os setores e a tela de usuários, mas não é master", () => {
    expect(getPermissions("admin")).toEqual({
      role: "admin",
      isMaster: false,
      canSeeUsers: true,
      segment: "",
      isPerson: false,
      canSeeAdmin: true,
      canSeeGoals: true,
    });
  });

  it("b2b e b2g ficam presos no próprio setor, sem usuários", () => {
    expect(getPermissions("b2b")).toEqual({
      role: "b2b",
      isMaster: false,
      canSeeUsers: false,
      segment: "B2B",
      isPerson: false,
      canSeeAdmin: true,
      canSeeGoals: false,
    });
    expect(getPermissions("b2g")).toEqual({
      role: "b2g",
      isMaster: false,
      canSeeUsers: false,
      segment: "B2G",
      isPerson: false,
      canSeeAdmin: true,
      canSeeGoals: false,
    });
  });

  it("vendedor e passagem só veem a própria área: nada do admin", () => {
    for (const role of ["vendor", "sdr"]) {
      expect(getPermissions(role)).toEqual({
        role,
        isMaster: false,
        canSeeUsers: false,
        segment: "",
        isPerson: true,
        canSeeAdmin: false,
        canSeeGoals: false,
      });
    }
  });

  it("sem perfil (backend antigo, sem perfis) tem acesso total, como antes", () => {
    expect(getPermissions(undefined)).toMatchObject({ role: "master", isMaster: true });
    expect(getPermissions("qualquer")).toMatchObject({ role: "master", isMaster: true, canSeeAdmin: true });
  });
});
