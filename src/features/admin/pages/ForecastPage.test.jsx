import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import { getForecast } from "../api/forecastApi";
import { ForecastSummary } from "../components/ForecastWidgets/ForecastWidgets";
import { buildForecast } from "../../../shared/mocks/mockForecast";
import ForecastPage from "./ForecastPage";

vi.mock("../api/forecastApi", () => ({ getForecast: vi.fn() }));
vi.mock("../utils/downloadFile", () => ({ downloadFile: vi.fn() }));
vi.mock("../../../shared/errorLogger", () => ({ reportError: vi.fn() }));

// Caso do PDF: 2 dias de R$ 39.248, 22 dias produtivos pela frente, meta de 3 milhões
const sale = (day, value) => ({ value, realizedAt: new Date(`${day}T03:00:00.000Z`) });
const buildResponse = ({ segment = null, goal = 3000000, goalIsTotal = true } = {}) => ({
  segment,
  goalIsTotal,
  ...buildForecast({
    sales: [sale("2026-11-03", 39248), sale("2026-11-04", 39248)],
    goal,
    now: new Date("2026-11-04T18:00:00.000Z"),
  }),
});

const renderWithUser = (ui, role = "admin") =>
  render(
    <AuthContext value={{ state: { user: { _id: "1", email: "x@teste.com", role }, token: "t" } }}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
    </AuthContext>,
  );

const textOf = (title) => screen.getByRole("region", { name: title }).textContent.replace(/ /g, " ");

describe("ForecastPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getForecast.mockResolvedValue(buildResponse());
  });

  it("mostra os cenários, os indicadores, o gráfico, o ritmo e a semana", async () => {
    renderWithUser(<ForecastPage />);

    await screen.findByRole("region", { name: "Cenários da campanha" });
    const scenarios = textOf("Cenários da campanha");
    expect(scenarios).toContain("RealistaR$ 941.952,00");
    expect(scenarios).toContain("PessimistaR$ 769.260,80");
    expect(scenarios).toContain("OtimistaR$ 1.114.643,20");
    expect(scenarios).toContain("Meta totalR$ 3.000.000,00");
    expect(scenarios).toContain("22 dias produtivos pela frente");

    const indicators = textOf("Indicadores do forecast");
    expect(indicators).toContain("Ritmo atualR$ 39.248,00/dia");
    expect(indicators).toContain("Ritmo necessárioR$ 132.795,64/dia");
    expect(indicators).toContain("Cobertura do ritmo29,6%");
    expect(indicators).toContain("Não é a chance de bater a meta");
    expect(indicators).toContain("Gap previsto (realista)R$ 2.058.048,00");
    expect(indicators).toContain("Chance de bater a meta0%");

    expect(within(screen.getByRole("region", { name: "Trajetórias do forecast" })).getByRole("img")).toBeInTheDocument();
    expect(textOf("Como o ritmo é calculado")).toContain("Últimos 7 dias produtivosR$ 39.248,0050%");
    expect(textOf("Forecast da semana")).toContain("Meta da semana: R$ 625.000,00");
  });

  it("admin troca o setor e o forecast é pedido para o setor", async () => {
    renderWithUser(<ForecastPage />);
    await screen.findByRole("region", { name: "Cenários da campanha" });
    expect(getForecast).toHaveBeenCalledWith("");

    getForecast.mockResolvedValue(buildResponse({ segment: "b2g", goal: 1000000, goalIsTotal: false }));
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar previsão por setor" }), { target: { value: "B2G" } });

    await waitFor(() => expect(getForecast).toHaveBeenCalledWith("B2G"));
    await waitFor(() => expect(textOf("Cenários da campanha")).toContain("Meta B2GR$ 1.000.000,00"));
  });

  it("b2b abre no B2B, sem poder trocar o setor", async () => {
    renderWithUser(<ForecastPage />, "b2b");
    await screen.findByRole("region", { name: "Cenários da campanha" });

    const select = screen.getByRole("combobox", { name: "Filtrar previsão por setor" });
    expect(select).toBeDisabled();
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["B2B"]);
    expect(getForecast).toHaveBeenCalledWith("B2B");
  });

  it("sem histórico (antes da campanha) a chance aparece como sem histórico suficiente", async () => {
    getForecast.mockResolvedValue({
      segment: null,
      goalIsTotal: true,
      ...buildForecast({ sales: [], goal: 3000000, now: new Date("2026-11-01T18:00:00.000Z") }),
    });
    renderWithUser(<ForecastPage />);

    await screen.findByRole("region", { name: "Indicadores do forecast" });
    expect(textOf("Indicadores do forecast")).toContain("Chance de bater a metaSem histórico suficiente");
  });

  it("total com setores de pesos diferentes (pace.weights null): o peso aparece como —", async () => {
    const response = buildResponse();
    getForecast.mockResolvedValue({
      ...response,
      campaign: { ...response.campaign, pace: { ...response.campaign.pace, weights: null } },
    });
    renderWithUser(<ForecastPage />);

    await screen.findByRole("region", { name: "Como o ritmo é calculado" });
    expect(textOf("Como o ritmo é calculado")).toContain("Últimos 7 dias produtivosR$ 39.248,00—");
  });

  it("widget Forecast da tela Gráficos: realista e a faixa entre pessimista e otimista", async () => {
    renderWithUser(<ForecastSummary segment="" />);

    await screen.findByRole("region", { name: "Forecast" });
    const summary = textOf("Forecast");
    expect(summary).toContain("Cenário realistaR$ 941.952,00");
    expect(summary).toContain("Entre R$ 769.260,80 (pessimista) e R$ 1.114.643,20 (otimista)");
    expect(summary).toContain("Cobertura do ritmo29,6%");
  });
});
