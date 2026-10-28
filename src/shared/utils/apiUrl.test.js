import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiUrl } from "./apiUrl";

describe("getApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devolve a VITE_API_URL", () => {
    vi.stubEnv("VITE_API_URL", "https://back-end-orca-black.onrender.com");

    expect(getApiUrl()).toBe("https://back-end-orca-black.onrender.com");
  });

  it("tira a barra do final, para não gerar // nas rotas", () => {
    vi.stubEnv("VITE_API_URL", "https://back-end-orca-black.onrender.com//");

    expect(getApiUrl()).toBe("https://back-end-orca-black.onrender.com");
  });
});
