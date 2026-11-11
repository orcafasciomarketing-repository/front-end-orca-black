import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadFile } from "../../admin/utils/downloadFile";
import CampaignReportsPage from "./CampaignReportsPage";
import GoalReportsPage from "./GoalReportsPage";

vi.mock("../../admin/utils/downloadFile", () => ({ downloadFile: vi.fn() }));
vi.mock("../../../shared/errorLogger", () => ({ reportError: vi.fn() }));

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 20000 });

const renderPage = (Page, path = "/") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Page />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const card = (title) => within(screen.getByRole("region", { name: `Relatório ${title}` }));

describe("Relatórios com os dados falsos (quarta 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
    vi.mocked(downloadFile).mockClear();
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("Campanha", () => {
    it("lista os relatórios e baixa o Excel de vendas como .xlsx", async () => {
      renderPage(CampaignReportsPage);

      expect(screen.getByRole("heading", { name: "Relatórios da campanha" })).toBeInTheDocument();
      for (const title of ["Vendas", "Pontos e ranking", "Prêmios", "Resumo da campanha"]) {
        expect(screen.getByRole("region", { name: `Relatório ${title}` })).toBeInTheDocument();
      }

      await screen.findByText("Campanha Black");
      fireEvent.click(card("Vendas").getByRole("button", { name: "Baixar Excel" }));

      await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1));
      const [content, fileName, type] = vi.mocked(downloadFile).mock.calls[0];
      expect(fileName).toMatch(/^vendas-campanha-black-2026-10-21\.xlsx$/);
      expect(type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(content.byteLength).toBeGreaterThan(1000);
    });

    it("pontos e prêmios também geram planilha", async () => {
      renderPage(CampaignReportsPage);
      await screen.findByText("Campanha Black");

      fireEvent.click(card("Pontos e ranking").getByRole("button", { name: "Baixar Excel" }));
      await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1));
      fireEvent.click(card("Prêmios").getByRole("button", { name: "Baixar Excel" }));
      await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(2));
      expect(vi.mocked(downloadFile).mock.calls[1][1]).toMatch(/^premios-campanha-black-/);
    });

    it("o resumo em PDF mostra a pré-visualização e Salvar PDF abre a impressão", async () => {
      renderPage(CampaignReportsPage);

      fireEvent.click(card("Resumo da campanha").getByRole("button", { name: "Gerar PDF" }));

      const preview = await screen.findByRole("region", { name: /Pré-visualização: Relatório da campanha/ });
      expect(within(preview).getByRole("table", { name: "Placar dos times" })).toBeInTheDocument();
      expect(within(preview).getByLabelText("Meta da campanha")).toHaveTextContent("Meta");
      fireEvent.click(within(preview).getByRole("button", { name: "Salvar PDF" }));
      expect(window.print).toHaveBeenCalled();

      fireEvent.click(within(preview).getByRole("button", { name: "Fechar" }));
      expect(screen.queryByRole("region", { name: /Pré-visualização/ })).not.toBeInTheDocument();
    });
  });

  describe("Metas", () => {
    it("abre no mês do endereço (?mes=), baixa o Excel e mostra o PDF do mês", async () => {
      renderPage(GoalReportsPage, "/admin/metas/relatorios?mes=2026-10");

      expect(screen.getByLabelText("Mês dos relatórios")).toHaveValue("2026-10");
      await screen.findByRole("region", { name: "Relatório Metas do mês" });
      fireEvent.click(card("Metas do mês").getByRole("button", { name: "Baixar Excel" }));
      await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1));
      expect(vi.mocked(downloadFile).mock.calls[0][1]).toBe("metas-2026-10-2026-10-21.xlsx");

      fireEvent.click(card("Metas do mês").getByRole("button", { name: "Gerar PDF" }));
      const preview = await screen.findByRole("region", {
        name: /Pré-visualização: Relatório de metas · outubro de 2026/,
      });
      expect(within(preview).getByRole("table", { name: "Vendedores" })).toBeInTheDocument();
      expect(within(preview).getByRole("table", { name: "Setores" })).toBeInTheDocument();
    });

    it("PDF de um vendedor com as faixas, a previsão e as semanas", async () => {
      renderPage(GoalReportsPage, "/admin/metas/relatorios?mes=2026-10");

      const select = await screen.findByLabelText("Vendedor do relatório");
      fireEvent.change(select, { target: { value: "vendor-brenda" } });
      fireEvent.click(card("Relatório de um vendedor").getByRole("button", { name: "Gerar PDF" }));

      const preview = await screen.findByRole("region", { name: "Pré-visualização: Relatório de metas · Brenda Lima" });
      expect(within(preview).getByRole("region", { name: "Meta" })).toBeInTheDocument();
      expect(within(preview).getByRole("table", { name: "Semanas" })).toBeInTheDocument();
    });

    it("mês sem metas avisa", async () => {
      renderPage(GoalReportsPage, "/admin/metas/relatorios?mes=2026-08");

      expect(await screen.findByText("Sem metas cadastradas em agosto de 2026.")).toBeInTheDocument();
    });
  });
});
