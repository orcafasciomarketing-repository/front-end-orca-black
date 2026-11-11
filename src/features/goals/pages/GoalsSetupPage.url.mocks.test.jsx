import { configure, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import GoalsSetupPage from "./GoalsSetupPage";

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 20000 });

const renderPage = (user) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthContext value={{ state: { user, token: "t" } }}>
        <GoalsSetupPage />
      </AuthContext>
    </QueryClientProvider>,
  );

const segmentOptions = () =>
  within(screen.getByLabelText("Setor das metas"))
    .getAllByRole("option")
    .map((option) => option.value);

describe("Cadastro de metas aberto pela lista (mês e setor no endereço)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("abre no mês e no setor do endereço (meta futura)", () => {
    window.history.replaceState(null, "", "/admin/metas?mes=2027-01&setor=b2g");
    renderPage({ _id: "m", role: "master" });

    expect(screen.getByLabelText("Mês das metas")).toHaveValue("2027-01");
    expect(screen.getByLabelText("Setor das metas")).toHaveValue("b2g");
    expect(segmentOptions()).toEqual(["b2b", "b2g"]);
  });

  it("admin do B2B só cadastra o B2B, mesmo com o B2G no endereço; mês inválido vira o atual", () => {
    window.history.replaceState(null, "", "/admin/metas?mes=2026-13&setor=b2g");
    renderPage({ _id: "t", role: "admin", manageSegment: "b2b" });

    expect(screen.getByLabelText("Mês das metas")).toHaveValue("2026-10");
    expect(screen.getByLabelText("Setor das metas")).toHaveValue("b2b");
    expect(segmentOptions()).toEqual(["b2b"]);
  });
});
