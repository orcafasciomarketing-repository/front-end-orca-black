import { afterEach, describe, expect, it, vi } from "vitest";

import { campaignKey, campaignParams, getSelectedCampaign, setSelectedCampaign } from "./campaignSelection";

describe("campanha escolhida no admin", () => {
  afterEach(() => setSelectedCampaign(""));

  it("sem escolha vale a ativa: chave 'active' e nenhum parâmetro na requisição", () => {
    expect(getSelectedCampaign()).toBe("");
    expect(campaignKey("")).toBe("active");
    expect(campaignParams("")).toEqual({});
  });

  it("guarda a escolha (também no navegador) e manda ?campaign= nas requisições", () => {
    setSelectedCampaign("c2");

    expect(getSelectedCampaign()).toBe("c2");
    expect(window.localStorage.getItem("admin-campaign")).toBe("c2");
    expect(campaignKey("c2")).toBe("c2");
    expect(campaignParams("c2")).toEqual({ campaign: "c2" });

    setSelectedCampaign("");
    expect(window.localStorage.getItem("admin-campaign")).toBeNull();
  });

  it("funciona mesmo sem acesso ao armazenamento do navegador", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    expect(() => setSelectedCampaign("c3")).not.toThrow();
    expect(getSelectedCampaign()).toBe("c3");
    vi.restoreAllMocks();
  });
});
