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
    it("Total: resumo, as três faixas separadas com o forecast, setores e partes, e o gráfico por vendedor", async () => {
      renderPage(GoalsProgressPage);

      const summary = await screen.findByLabelText("Resumo das metas");
      expect(textOf(summary)).toMatch(/Vendedores com meta11/);
      expect(screen.getByRole("button", { name: "Total" })).toHaveAttribute("aria-pressed", "true");

      const month = within(screen.getByRole("region", { name: "Mês · Total" }));
      expect(month.getAllByRole("progressbar").map((bar) => bar.getAttribute("aria-label"))).toEqual([
        "Progresso da Meta",
        "Progresso da Super meta",
        "Progresso da Meta black",
      ]);
      expect(month.getAllByText("Chance de bater")).toHaveLength(3);
      expect(textOf(month.getByRole("region", { name: "Previsão do mês · Total" }))).toMatch(
        /PessimistaR\$ .*RealistaR\$ .*OtimistaR\$/,
      );

      const parts = within(screen.getByRole("table", { name: "Setores, Farmer e Venda" }));
      expect(parts.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
        "Setor B2B",
        "Setor B2G",
        "Farmer",
        "Venda",
      ]);
      expect(within(screen.getByLabelText("Percentual da Meta por vendedor")).getAllByRole("listitem")).toHaveLength(
        11,
      );
    });

    it("o filtro de setor mostra só o setor escolhido, com Farmer e Venda dele", async () => {
      renderPage(GoalsProgressPage);
      await screen.findByLabelText("Resumo das metas");

      fireEvent.change(screen.getByLabelText("Filtrar metas por setor"), { target: { value: "b2g" } });

      expect(screen.getByRole("region", { name: "Mês · Setor B2G" })).toBeInTheDocument();
      expect(
        within(screen.getByRole("table", { name: "Farmer e Venda · Setor B2G" }))
          .getAllByRole("rowheader")
          .map((cell) => cell.textContent),
      ).toEqual(["Farmer", "Venda"]);
      expect(within(screen.getByLabelText("Percentual da Meta por vendedor")).getAllByRole("listitem")).toHaveLength(3);
    });

    it("clicar no vendedor abre a visão por vendedor só com a conta dele, as faixas, o forecast e as semanas", async () => {
      renderPage(GoalsProgressPage);
      const table = within(await screen.findByRole("region", { name: "Vendedores" }));

      fireEvent.click(table.getByRole("button", { name: "Brenda Lima" }));

      expect(screen.getByRole("button", { name: "Por vendedor" })).toHaveAttribute("aria-pressed", "true");
      const vendor = screen.getByRole("region", { name: "Vendedor Brenda Lima" });
      expect(textOf(vendor)).toMatch(/Conta Venda: só as vendas novas contam/);
      expect(screen.getByRole("region", { name: "Mês · Brenda Lima" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Previsão do mês · Brenda Lima" })).toBeInTheDocument();
      expect(screen.getByRole("table", { name: "Semanas de Brenda Lima" })).toBeInTheDocument();
      expect(screen.queryByLabelText("Resumo das metas")).not.toBeInTheDocument();
      expect(screen.queryByRole("table", { name: /Farmer e Venda/ })).not.toBeInTheDocument();

      const select = screen.getByLabelText("Escolher vendedor");
      const farmer = [...select.options].find((option) => option.textContent.endsWith("Farmer"));
      fireEvent.change(select, { target: { value: farmer.value } });

      expect(textOf(screen.getByRole("region", { name: /^Vendedor / }))).toMatch(/Conta Farmer: só as renovações/);
    });

    it("evolução diária, semanal e mensal (histórico dos meses)", async () => {
      renderPage(GoalsProgressPage);
      const evolution = within(await screen.findByRole("region", { name: "Evolução · Total" }));

      expect(evolution.getByRole("img", { name: /Evolução diária acumulada de Total/ })).toBeInTheDocument();
      expect(evolution.getByRole("img", { name: /Vendido por dia de Total/ })).toBeInTheDocument();

      fireEvent.click(evolution.getByRole("button", { name: "Semanal" }));
      expect(evolution.getByRole("img", { name: /Evolução semanal de Total/ })).toBeInTheDocument();

      fireEvent.click(evolution.getByRole("button", { name: "Mensal" }));
      expect(await evolution.findByRole("img", { name: /Evolução mensal de Total/ })).toBeInTheDocument();
      expect(evolution.getByRole("table", { name: "Evolução mensal de Total" })).toBeInTheDocument();
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
      expect(textOf(screen.getByRole("table", { name: "Divisão das metas do setor" }))).toMatch(
        /MetaR\$ 48\.000,00R\$ 72\.000,00R\$ 120\.000,00Super metaR\$ 60\.000,00R\$ 90\.000,00R\$ 150\.000,00Meta blackR\$ 80\.000,00R\$ 120\.000,00R\$ 200\.000,00/,
      );
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

    it("mudar a Meta Farmer redistribui as metas dos Farmers pelos pesos e a Super acompanha o %", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByLabelText("Distribuição");

      fireEvent.change(screen.getByLabelText("Meta Farmer (R$)"), { target: { value: "56000" } });

      expect(textOf(screen.getByLabelText("Distribuição"))).toMatch(
        /Renovação: distribuído R\$ 56\.000,00 de R\$ 56\.000,00/,
      );
      expect(textOf(screen.getByRole("table", { name: "Divisão das metas do setor" }))).toMatch(
        /Super metaR\$ 70\.000,00/,
      );
      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeEnabled();

      fireEvent.change(screen.getByLabelText("Meta Farmer (R$)"), { target: { value: "70000" } });

      expect(screen.getByText(/Farmer: a Meta black precisa ser maior que a Super meta/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeDisabled();
    });

    it("Super meta e Meta black de cada vendedor são editáveis e voltam ao automático", async () => {
      renderPage(GoalsSetupPage);
      const superInput = await screen.findByLabelText("Super meta de Brenda Lima");
      expect(screen.getByLabelText("Meta black de Brenda Lima")).toBeInTheDocument();
      expect(textOf(screen.getByLabelText("Distribuição"))).toMatch(/Super meta Vendas: distribuído/);

      fireEvent.change(superInput, { target: { value: "1" } });

      expect(
        screen.getByText(/A Super meta de cada vendedor não pode ser menor que a Meta do mês dele/),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salvar metas" })).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Voltar ao automático" }));

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
