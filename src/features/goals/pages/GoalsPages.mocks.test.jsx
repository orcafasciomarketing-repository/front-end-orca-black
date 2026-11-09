import { configure, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GoalsProgressPage from "./GoalsProgressPage";
import GoalsSetupPage from "./GoalsSetupPage";

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 20000 });

const renderPage = (Page) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Page />
    </QueryClientProvider>,
  );

const textOf = (element) => element.textContent.replace(/\u00a0/g, " ");

describe("Telas de metas com os dados falsos (quarta 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("Metas por vendedor", () => {
    it("resumo, os dois setores com a faixa atual e o gráfico por vendedor", async () => {
      renderPage(GoalsProgressPage);

      const summary = await screen.findByLabelText("Resumo das metas");
      expect(textOf(summary)).toMatch(/Vendedores com meta11/);
      expect(screen.getByRole("region", { name: "Setor B2B" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Setor B2G" })).toBeInTheDocument();
      expect(within(screen.getByRole("region", { name: "Mês · B2B" })).getByRole("progressbar")).toBeInTheDocument();
      expect(within(screen.getByLabelText("Percentual da Meta por vendedor")).getAllByRole("listitem")).toHaveLength(
        11,
      );
    });

    it("o filtro de setor deixa só o setor escolhido", async () => {
      renderPage(GoalsProgressPage);
      await screen.findByLabelText("Resumo das metas");

      fireEvent.change(screen.getByLabelText("Filtrar metas por setor"), { target: { value: "b2g" } });

      expect(screen.queryByRole("region", { name: "Setor B2B" })).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Setor B2G" })).toBeInTheDocument();
      expect(within(screen.getByLabelText("Percentual da Meta por vendedor")).getAllByRole("listitem")).toHaveLength(3);
    });

    it("clicar no vendedor abre o detalhe com a faixa atual, as semanas e a evolução", async () => {
      renderPage(GoalsProgressPage);
      const table = within(await screen.findByRole("region", { name: "Vendedores" }));

      fireEvent.click(table.getByRole("button", { name: "Brenda Lima" }));

      const detail = within(screen.getByRole("region", { name: "Detalhe de Brenda Lima" }));
      expect(detail.getByRole("region", { name: "Mês" })).toBeInTheDocument();
      expect(detail.getByRole("table", { name: "Semanas de Brenda Lima" })).toBeInTheDocument();
      expect(detail.getByRole("img", { name: /Evolução do mês de Brenda Lima/ })).toBeInTheDocument();
    });

    it("mês sem metas avisa para cadastrar", async () => {
      renderPage(GoalsProgressPage);
      await screen.findByLabelText("Resumo das metas");

      fireEvent.change(screen.getByLabelText("Mês do acompanhamento"), { target: { value: "2026-09" } });

      expect(await screen.findByText(/Nenhuma meta cadastrada em setembro de 2026/)).toBeInTheDocument();
    });
  });

  describe("Cadastro de metas", () => {
    it("abre o mês salvo do B2B com a distribuição fechando e o salvar liberado", async () => {
      renderPage(GoalsSetupPage);

      const totals = await screen.findByLabelText("Distribuição");
      expect(textOf(totals)).toMatch(/Renovação: distribuído R\$ 48\.000,00 de R\$ 48\.000,00/);
      expect(textOf(totals)).toMatch(/Vendas: distribuído R\$ 72\.000,00 de R\$ 72\.000,00/);
      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeEnabled();
      expect(screen.queryByText(/Mês sem metas/)).not.toBeInTheDocument();
    });

    it("semana que não fecha trava o salvar; redistribuir resolve", async () => {
      renderPage(GoalsSetupPage);
      const week = await screen.findByLabelText("Semana 1 de Brenda Lima");

      fireEvent.change(week, { target: { value: "1" } });

      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeDisabled();
      expect(screen.getByText(/A soma das semanas precisa dar a meta do mês/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Redistribuir pelos pesos" }));

      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeEnabled();
    });

    it("mudar a meta do setor redistribui as metas das pessoas pelos pesos", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByLabelText("Distribuição");

      fireEvent.change(screen.getByRole("spinbutton", { name: "Meta do mês (R$)" }), { target: { value: "200000" } });

      expect(textOf(screen.getByLabelText("Distribuição"))).toMatch(
        /Renovação: distribuído R\$ 80\.000,00 de R\$ 80\.000,00/,
      );
      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeEnabled();
    });

    it("com os dados de demonstração, salvar avisa que não grava", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByLabelText("Distribuição");

      fireEvent.click(screen.getByRole("button", { name: "Salvar metas" }));

      expect(await screen.findByText(/não funciona com os dados de demonstração/)).toBeInTheDocument();
    });

    it("mês sem metas e sem mês anterior começa em branco", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByLabelText("Distribuição");

      fireEvent.change(screen.getByLabelText("Mês das metas"), { target: { value: "2026-12" } });

      expect(await screen.findByText(/Mês sem metas. Preencha/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeDisabled();
    });
  });
});
