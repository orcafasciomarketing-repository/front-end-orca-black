import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPeoplePoints } from "../../api/pointsApi";
import { downloadFile } from "../../utils/downloadFile";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import { PeoplePointsChart, PeoplePointsWidget } from "./PeoplePoints";

vi.mock("../../api/pointsApi", () => ({
  getPeoplePoints: vi.fn(),
}));
vi.mock("../../utils/downloadFile", () => ({
  downloadFile: vi.fn(),
}));

const teams = [
  { teamId: "a", teamName: "Alfa" },
  { teamId: "b", teamName: "Beta" },
];

const person = (personId, name, teamId, sales, farm, passage, kind = "vendor") => ({
  personId,
  kind,
  name,
  job: kind === "vendor" ? "B2B Sales" : "CS",
  teamId,
  sales,
  farm,
  passage,
  total: sales + farm + passage,
});

const byPeriod = {
  all: [
    person("v1", "Bruno", "b", 6, 2, 0),
    person("s1", "Carla", "a", 0, 0, 3, "sdr"),
    person("v2", "Diego", "a", 1, 0, 0),
  ],
  week: [
    person("v2", "Diego", "a", 4, 0, 0),
    person("v1", "Bruno", "b", 0, 0, 0),
    person("s1", "Carla", "a", 0, 0, 0, "sdr"),
  ],
};

const rows = () =>
  within(screen.getByRole("list", { name: "Pontos por pessoa" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("PeoplePoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPeoplePoints.mockImplementation(async ({ period }) => ({ teams, people: byPeriod[period] ?? byPeriod.all }));
  });

  it("Dashboard: classificação de todos, com equipe, cargo, divisão e total", async () => {
    renderWithQuery(<PeoplePointsWidget />);

    await screen.findByText("Bruno");
    expect(getPeoplePoints).toHaveBeenCalledWith({ period: "all", segment: "", from: "", to: "", campaign: "" });
    expect(rows()).toEqual([
      expect.stringMatching(/^1ºBrunoBeta · B2B Sales8 pontosvenda 6, renovação 2, passagem 0$/),
      expect.stringMatching(/^2ºCarlaAlfa · CS3 pontos/),
      expect.stringMatching(/^3ºDiegoAlfa · B2B Sales1 ponto/),
    ]);
    expect(screen.getByRole("button", { name: "Campanha" })).toHaveAttribute("aria-pressed", "true");
  });

  it("Dashboard: escolher a equipe mostra só as pessoas dela, com as posições recontadas", async () => {
    renderWithQuery(<PeoplePointsWidget />);
    await screen.findByText("Bruno");

    const select = screen.getByRole("combobox", { name: "Filtrar pontos por equipe" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todas as equipes", "Alfa", "Beta"]);

    fireEvent.change(select, { target: { value: "a" } });

    expect(rows()).toEqual([expect.stringMatching(/^1ºCarla/), expect.stringMatching(/^2ºDiego/)]);
  });

  it("Dashboard: as abas trocam o período e a equipe escolhida continua", async () => {
    renderWithQuery(<PeoplePointsWidget segment="B2B" />);
    await screen.findByText("Bruno");
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar pontos por equipe" }), { target: { value: "a" } });

    fireEvent.click(screen.getByRole("button", { name: "Esta semana" }));

    await waitFor(() =>
      expect(rows()).toEqual([
        expect.stringMatching(/^1ºDiego.*4 pontos/),
        expect.stringMatching(/^2ºCarla.*0 pontos/),
      ]),
    );
    expect(getPeoplePoints).toHaveBeenLastCalledWith({ period: "week", segment: "B2B", from: "", to: "", campaign: "" });
    expect(screen.getByRole("combobox", { name: "Filtrar pontos por equipe" })).toHaveValue("a");
  });

  it("Gráficos: usa o período da página como from/to e exporta o CSV da equipe escolhida", async () => {
    const period = { type: "preset", key: "last-7", start: "2026-11-01", end: "2026-11-07", label: "Últimos 7 dias" };
    renderWithQuery(<PeoplePointsChart period={period} segment="" />);
    await screen.findByText("Bruno");

    expect(getPeoplePoints).toHaveBeenCalledWith({ period: "all", segment: "", from: "2026-11-01", to: "2026-11-07", campaign: "" });

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar pontos por equipe" }), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV: Pontos por pessoa" }));

    const [csv] = downloadFile.mock.calls[0];
    expect(csv).toContain("Posição;Pessoa;Equipe;Cargo;Venda;Renovação;Passagem;Total");
    expect(csv).toContain("1º;Bruno;Beta;B2B Sales;6;2;0;8");
    expect(csv).not.toContain("Carla");
  });

  it("equipe sem ninguém mostra o aviso", async () => {
    getPeoplePoints.mockResolvedValue({ teams: [...teams, { teamId: "c", teamName: "Gama" }], people: byPeriod.all });
    renderWithQuery(<PeoplePointsWidget />);
    await screen.findByText("Bruno");

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar pontos por equipe" }), { target: { value: "c" } });

    expect(screen.getByText("Nenhuma pessoa nesta equipe")).toBeInTheDocument();
  });
});
