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
      expect(screen.getByRole("region", { name: "Alertas do mês" })).toBeInTheDocument();
      const comparison = await screen.findByRole("region", { name: "Comparação com o mês anterior · Total" });
      expect(textOf(comparison)).toMatch(/setembro de 2026R\$ [\d.,]+Sem meta cadastrada/);
      expect(textOf(comparison)).toMatch(/Este mês até agora/);
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

    it("abas: Todos mostra tudo; cada aba mostra só os widgets dela", async () => {
      renderPage(GoalsProgressPage);
      await screen.findByLabelText("Resumo das metas");

      const nav = screen.getByRole("navigation", { name: "Seções do painel" });
      expect(
        within(nav)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Todos", "Resumo e alertas", "Mês", "Semana atual", "Evolução", "Setores e times", "Vendedores"]);
      expect(within(nav).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("region", { name: "Mês · Total" })).toBeInTheDocument();

      fireEvent.click(within(nav).getByRole("button", { name: "Vendedores" }));

      expect(screen.getByRole("heading", { name: "Vendedores" })).toBeInTheDocument();
      expect(screen.queryByLabelText("Resumo das metas")).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Mês · Total" })).not.toBeInTheDocument();

      fireEvent.click(within(nav).getByRole("button", { name: "Mês" }));
      const month = screen.getByRole("region", { name: "Mês · Total" });
      expect(within(month).getByRole("region", { name: "Previsão do mês · Total" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Vendedores" })).not.toBeInTheDocument();
    });

    it("na visão por vendedor as abas são as do vendedor, e trocar de visão volta para Todos", async () => {
      renderPage(GoalsProgressPage);
      await screen.findByLabelText("Resumo das metas");
      fireEvent.click(
        within(screen.getByRole("navigation", { name: "Seções do painel" })).getByRole("button", { name: "Mês" }),
      );

      fireEvent.click(screen.getByRole("button", { name: "Por vendedor" }));

      const nav = screen.getByRole("navigation", { name: "Seções do painel" });
      expect(
        within(nav)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Todos", "Mês", "Semana atual", "Como chegar na meta", "Evolução", "Semanas"]);
      expect(within(nav).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(within(nav).getByRole("button", { name: "Semanas" }));
      expect(screen.getByRole("table", { name: /^Semanas de / })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /^Mês · / })).not.toBeInTheDocument();
    });

    it("mês sem metas avisa para cadastrar", async () => {
      renderPage(GoalsProgressPage);
      await screen.findByLabelText("Resumo das metas");

      fireEvent.change(screen.getByLabelText("Mês do acompanhamento"), { target: { value: "2026-09" } });

      expect(await screen.findByText(/Nenhuma meta cadastrada em setembro de 2026/)).toBeInTheDocument();
    });
  });

  describe("Cadastro de metas", () => {
    const sectorTable = () => textOf(screen.getByRole("table", { name: "Divisão das metas do setor" }));
    const saveButton = () => screen.getByRole("button", { name: "Salvar metas" });
    const moneyOf = (input) => input.value.replace(/\u00a0/g, " ");

    it("abre o mês salvo do B2B com os níveis de Farmer e de Venda, a soma do setor e o salvar liberado", async () => {
      renderPage(GoalsSetupPage);

      await screen.findByRole("region", { name: "Níveis · Farmer" });
      expect(screen.getByRole("region", { name: "Níveis · Venda" })).toBeInTheDocument();
      expect(sectorTable()).toMatch(
        /MetaR\$ 26\.000,00R\$ 82\.000,00R\$ 108\.000,00Super metaR\$ 32\.500,00R\$ 100\.000,00R\$ 132\.500,00Meta blackR\$ 80\.000,00R\$ 100\.000,00R\$ 180\.000,00/,
      );
      expect(moneyOf(screen.getByLabelText("Meta do nível Júnior de Venda"))).toBe("R$ 12.000,00");
      expect(moneyOf(screen.getByLabelText("Super meta do nível Júnior de Venda"))).toBe("R$ 15.000,00");
      expect(moneyOf(screen.getByLabelText("Meta black Venda (R$)"))).toBe("R$ 100.000,00");
      expect(screen.queryByLabelText(/Antecipação/)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Conversão de leads Venda (%)")).toHaveValue(30);
      const salesLevels = within(screen.getByRole("table", { name: "Níveis · Venda" }));
      expect(textOf(salesLevels.getAllByRole("row")[1])).toMatch(/414Remover$/);
      expect(moneyOf(screen.getByLabelText("Meta do mês de Brenda Lima"))).toBe("R$ 12.000,00");
      expect(screen.queryByLabelText(/Semana 1 de/)).not.toBeInTheDocument();
      expect(screen.getByText(/A meta da semana é calculada sozinha/)).toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
      expect(screen.queryByText(/Mês sem metas/)).not.toBeInTheDocument();
    });

    it("mudar a Meta de um nível muda a meta de quem é dele e a do setor; Super menor que a Meta trava", async () => {
      renderPage(GoalsSetupPage);
      const levelGoal = await screen.findByLabelText("Meta do nível Júnior de Venda");

      fireEvent.change(levelGoal, { target: { value: "13000" } });

      expect(moneyOf(screen.getByLabelText("Meta do mês de Brenda Lima"))).toBe("R$ 13.000,00");
      expect(sectorTable()).toMatch(/MetaR\$ 26\.000,00R\$ 83\.000,00R\$ 109\.000,00/);
      expect(saveButton()).toBeEnabled();

      fireEvent.change(levelGoal, { target: { value: "16000" } });

      expect(screen.getByText(/Júnior: a Super precisa ser igual ou maior que a Meta/)).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("Meta, Super e Meta black de cada vendedor são editáveis e voltam ao nível", async () => {
      renderPage(GoalsSetupPage);
      const superInput = await screen.findByLabelText("Super meta de Brenda Lima");
      expect(screen.getByLabelText("Meta black de Brenda Lima")).toBeInTheDocument();

      fireEvent.change(superInput, { target: { value: "1" } });

      expect(
        screen.getByText(/A Super meta de cada vendedor não pode ser menor que a Meta do mês dele/),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();

      fireEvent.blur(superInput);
      fireEvent.click(screen.getByRole("button", { name: "Voltar ao nível" }));

      expect(moneyOf(screen.getByLabelText("Super meta de Brenda Lima"))).toBe("R$ 15.000,00");
      expect(saveButton()).toBeEnabled();
    });

    it("no mês com Meta black, Farmer abaixo da Super trava o salvar", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByLabelText("Meta black Farmer (R$)");

      fireEvent.change(screen.getByLabelText("Meta black Farmer (R$)"), { target: { value: "20000" } });

      expect(screen.getByText(/Farmer: a Meta black não pode ser menor que a Super meta/)).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("B2G não tem ticket médio nem conversão (nem as colunas de vendas e leads necessários)", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByLabelText("Ticket médio Farmer (R$)");

      fireEvent.change(screen.getByLabelText("Setor das metas"), { target: { value: "b2g" } });

      await screen.findByRole("form", { name: /Metas B2G/ });
      expect(screen.queryByLabelText(/Ticket médio/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Conversão de leads/)).not.toBeInTheDocument();
      expect(within(screen.getByRole("table", { name: "Níveis · Venda" })).queryByText("Leads necessários")).toBeNull();
    });

    it("adicionar e remover nível de um tipo", async () => {
      renderPage(GoalsSetupPage);
      const farm = within(await screen.findByRole("region", { name: "Níveis · Farmer" }));

      fireEvent.click(farm.getByRole("button", { name: "Adicionar nível" }));

      expect(farm.getAllByRole("row")).toHaveLength(5);
      expect(screen.getByText(/Nível 4: dê um nome; preencha a Meta/)).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();

      fireEvent.click(farm.getByRole("button", { name: "Remover o nível Nível 4 de Farmer" }));

      expect(farm.getAllByRole("row")).toHaveLength(4);
      expect(saveButton()).toBeEnabled();
    });

    it("com os dados de demonstração, salvar avisa que não grava", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByRole("region", { name: "Níveis · Farmer" });

      fireEvent.click(saveButton());

      expect(await screen.findByText(/não funciona com os dados de demonstração/)).toBeInTheDocument();
    });

    it("mês sem metas e sem mês anterior começa em branco", async () => {
      renderPage(GoalsSetupPage);
      await screen.findByRole("region", { name: "Níveis · Farmer" });

      fireEvent.change(screen.getByLabelText("Mês das metas"), { target: { value: "2026-12" } });

      expect(await screen.findByText(/Mês sem metas. Preencha/)).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });
  });
});
