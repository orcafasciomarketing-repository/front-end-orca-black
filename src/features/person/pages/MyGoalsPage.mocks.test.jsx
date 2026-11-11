import { configure, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MyGoalsPage from "./MyGoalsPage";

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 15000 });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyGoalsPage />
    </QueryClientProvider>,
  );

const textOf = (element) => element.textContent.replace(/\u00a0/g, " ");

describe("Minhas metas com os dados falsos (Brenda Lima, quarta 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("mostra o resumo: vendido, quanto falta, quanto vender por dia, a meta da semana e a previsão", async () => {
    renderPage();

    const summary = await screen.findByLabelText("Resumo das minhas metas");
    const text = textOf(summary);
    expect(text).toMatch(/Vendido no mêsR\$ [\d.,]+/);
    expect(text).toMatch(/Falta para a (Meta|Super meta|Meta black)|Todas as faixas batidas/);
    expect(text).toContain("Precisa vender por dia");
    expect(text).toMatch(/Meta da semanaR\$ [\d.,]+/);
    expect(text).toContain("Vendido hoje");
    expect(text).toMatch(/Previsão realistaR\$ [\d.,]+/);
  });

  it("mostra as faixas do mês e da semana atual, a previsão, a evolução e as semanas", async () => {
    renderPage();

    const month = await screen.findByRole("region", { name: "Meu mês" });
    expect(within(month).getByRole("region", { name: "Meta" })).toBeInTheDocument();
    expect(within(month).getByRole("region", { name: "Super meta" })).toBeInTheDocument();
    expect(within(month).getByRole("region", { name: "Minha previsão do mês" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Minha semana atual" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evolução · Você" })).toBeInTheDocument();
    expect(textOf(screen.getByRole("region", { name: "Como chegar na meta" }))).toContain(
      "Pelo ticket médio de R$ 3.000,00",
    );

    const weeks = screen.getByRole("table", { name: "Minhas metas por semana" });
    expect(within(weeks).getAllByRole("row")).toHaveLength(5);
    expect(textOf(weeks)).toContain("Semana 3 · 19/10 a 25/10");
    expect(within(weeks).getByRole("columnheader", { name: "Meta por dia útil" })).toBeInTheDocument();
  });

  it("a evolução mensal usa só o histórico dela", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Mensal" }));

    expect(await screen.findByRole("img", { name: /Evolução mensal de Você/ })).toBeInTheDocument();
  });

  it("mês sem meta cadastrada avisa", async () => {
    renderPage();
    await screen.findByLabelText("Resumo das minhas metas");

    fireEvent.change(screen.getByLabelText("Mês das metas"), { target: { value: "2026-08" } });

    expect(await screen.findByText("Você ainda não tem meta cadastrada para agosto de 2026")).toBeInTheDocument();
  });
});
