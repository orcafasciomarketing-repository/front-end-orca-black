import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getScoreboard } from "../../api/dashboardApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import TeamRankingScreen from "./TeamRankingScreen";

vi.mock("../../api/dashboardApi", () => ({
  getScoreboard: vi.fn(),
}));

const makeTeam = (id, total) => ({
  id,
  teamId: id,
  teamName: `Time ${id}`,
  teamShirt: null,
  sales: total,
  farm: 0,
  passage: 0,
  total,
});

describe("TeamRankingScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca o placar do período e ordena do maior para o menor total", async () => {
    getScoreboard.mockResolvedValue([makeTeam("b", 140), makeTeam("a", 179), makeTeam("c", 150)]);

    renderWithQuery(<TeamRankingScreen period="week" />);

    const podium = await screen.findByRole("list");
    const cards = within(podium).getAllByRole("listitem");

    expect(getScoreboard).toHaveBeenCalledWith("week");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText("179")).toBeInTheDocument();
    expect(within(cards[1]).getByText("150")).toBeInTheDocument();
    expect(within(cards[2]).getByText("140")).toBeInTheDocument();
  });

  it("mostra o subtítulo de acordo com o período", async () => {
    getScoreboard.mockResolvedValue([makeTeam("a", 10)]);

    renderWithQuery(<TeamRankingScreen period="week" />);

    expect(await screen.findByText("Semanal")).toBeInTheDocument();
  });

  it("no período geral busca o acumulado e mostra o subtítulo certo", async () => {
    getScoreboard.mockResolvedValue([makeTeam("a", 10)]);

    renderWithQuery(<TeamRankingScreen period="all" />);

    expect(await screen.findByText("Geral acumulado")).toBeInTheDocument();
    expect(getScoreboard).toHaveBeenCalledWith("all");
  });

  it("avisa quando não há times", async () => {
    getScoreboard.mockResolvedValue([]);

    renderWithQuery(<TeamRankingScreen period="week" />);

    expect(await screen.findByText("Nenhum time cadastrado")).toBeInTheDocument();
  });
});
