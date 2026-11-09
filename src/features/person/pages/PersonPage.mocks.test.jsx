import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PersonPage from "./PersonPage";

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 15000 });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PersonPage />
    </QueryClientProvider>,
  );

const region = (name) => screen.getByRole("region", { name });
const textOf = (element) => element.textContent.replace(/ /g, " ");

describe("Minha área com os dados falsos (Brenda Lima, quarta 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("mostra o nome, o cargo e o time", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Olá, Brenda Lima" })).toBeInTheDocument();
    expect(screen.getByText("B2B Sales · Wizards of sales")).toBeInTheDocument();
  });

  it("lista só as vendas dela, com o resumo", async () => {
    renderPage();

    const salesList = () => within(screen.getByRole("heading", { name: "Minhas vendas" }).closest("section"));
    await waitFor(() => expect(salesList().getAllByRole("listitem").length).toBeGreaterThan(0));
    const list = salesList().getAllByRole("listitem");
    expect(list.every((item) => textOf(item).includes("VendedorBrenda Lima"))).toBe(true);

    expect(textOf(screen.getByLabelText("Resumo: Minhas vendas"))).toMatch(
      /Total vendidoR\$ [\d.,]+Vendas concluídas\d+/,
    );
  });

  it("ranking dos times com o time dela destacado e os pontos de cada colega, sem valores de venda", async () => {
    renderPage();

    await waitFor(() => expect(within(region("Ranking dos times")).getAllByRole("listitem")).toHaveLength(3));
    expect(textOf(region("Ranking dos times"))).toMatch(/Seu time está em \dº lugar/);
    expect(within(region("Ranking dos times")).getByText("(seu time)")).toBeInTheDocument();

    const people = within(region("Pontos do meu time")).getAllByRole("listitem");
    expect(people.length).toBeGreaterThan(1);
    expect(within(region("Pontos do meu time")).getByText("Você ·")).toBeInTheDocument();
    expect(textOf(region("Pontos do meu time"))).not.toContain("R$");
  });

  it("as abas trocam o período do ranking e dos pontos", async () => {
    renderPage();
    await waitFor(() => expect(within(region("Ranking dos times")).getAllByRole("listitem")).toHaveLength(3));

    fireEvent.click(within(region("Ranking dos times")).getByRole("button", { name: "Semana passada" }));

    await waitFor(() =>
      expect(within(region("Ranking dos times")).getByRole("button", { name: "Semana passada" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    await waitFor(() => expect(within(region("Ranking dos times")).getAllByRole("listitem")).toHaveLength(3));
  });
});
