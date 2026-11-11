import { configure, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MyGoalsPage from "./MyGoalsPage";

const mockVisibility = vi.hoisted(() => ({ value: null, closed: false }));

vi.mock("../api/meApi", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getMyGoals: async (month) => {
      const data = await original.getMyGoals(month);
      if (mockVisibility.closed)
        return {
          ...data,
          visibility: { open: false, hidden: [] },
          closed: true,
          person: null,
        };
      return mockVisibility.value
        ? { ...data, visibility: mockVisibility.value }
        : data;
    },
  };
});

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 15000 });

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MyGoalsPage />
    </QueryClientProvider>,
  );

const textOf = (element) => element.textContent.replace(/ /g, " ");

describe("Minhas metas com o que o admin liberou (Brenda Lima, quarta 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
    mockVisibility.value = null;
    mockVisibility.closed = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("mês fechado: só o aviso de que as metas ainda não foram liberadas", async () => {
    mockVisibility.closed = true;
    renderPage();

    expect(
      await screen.findByText(
        "As metas de outubro de 2026 ainda não foram liberadas",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Resumo das minhas metas"),
    ).not.toBeInTheDocument();
  });

  it("widgets escondidos não aparecem, nem o que depende deles no resumo", async () => {
    mockVisibility.value = {
      open: true,
      hidden: ["forecast", "week", "weeks", "evolution"],
    };
    renderPage();

    const summary = textOf(
      await screen.findByLabelText("Resumo das minhas metas"),
    );
    expect(summary).toContain("Precisa vender por dia");
    expect(summary).not.toContain("Meta da semana");
    expect(summary).not.toContain("Previsão realista");
    expect(
      screen.queryByRole("region", { name: "Minha previsão do mês" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Minha semana atual" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Minhas metas por semana" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Meu mês" })).toBeInTheDocument();
  });

  it("Super escondida tira a coluna da tabela das semanas; resumo escondido some", async () => {
    mockVisibility.value = { open: true, hidden: ["super", "summary"] };
    renderPage();

    const table = await screen.findByRole("table", {
      name: "Minhas metas por semana",
    });
    expect(textOf(table)).not.toContain("Super meta");
    expect(
      screen.queryByLabelText("Resumo das minhas metas"),
    ).not.toBeInTheDocument();
  });

  it("nada liberado: avisa", async () => {
    mockVisibility.value = {
      open: true,
      hidden: [
        "summary",
        "month",
        "forecast",
        "comparison",
        "breakdown",
        "week",
        "evolution",
        "weeks",
      ],
    };
    renderPage();

    expect(
      await screen.findByText(
        "Nenhuma informação de outubro de 2026 foi liberada ainda",
      ),
    ).toBeInTheDocument();
  });
});
