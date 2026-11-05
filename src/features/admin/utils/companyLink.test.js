import { describe, expect, it } from "vitest";

import { toCompanyUrl } from "./companyLink";

describe("toCompanyUrl", () => {
  it("aceita link com https, com http e sem protocolo", () => {
    expect(toCompanyUrl("https://www.acme.com.br/contato")).toBe("https://www.acme.com.br/contato");
    expect(toCompanyUrl("http://acme.com")).toBe("http://acme.com/");
    expect(toCompanyUrl("www.acme.com.br")).toBe("https://www.acme.com.br/");
    expect(toCompanyUrl("  acme.com.br/sobre  ")).toBe("https://acme.com.br/sobre");
  });

  it("nome comum continua texto", () => {
    expect(toCompanyUrl("Construtora Horizonte")).toBeNull();
    expect(toCompanyUrl("ACME")).toBeNull();
    expect(toCompanyUrl("")).toBeNull();
    expect(toCompanyUrl(null)).toBeNull();
  });

  it("recusa endereços que não são de site", () => {
    expect(toCompanyUrl("javascript:alert(1)")).toBeNull();
    expect(toCompanyUrl("mailto:contato@acme.com")).toBeNull();
    expect(toCompanyUrl("data:text/html,oi")).toBeNull();
    expect(toCompanyUrl("http://localhost")).toBeNull();
  });
});
