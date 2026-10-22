import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSdrRanking } from "../../api/dashboardApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import AssistRankingScreen from "./AssistRankingScreen";

vi.mock("../../api/dashboardApi", () => ({
  getSdrRanking: vi.fn(),
}));

const makeSdr = (id, points) => ({ id, sdrId: id, name: `SDR ${id}`, points });

describe("AssistRankingScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca o ranking de passagens do período e ordena do maior para o menor", async () => {
    getSdrRanking.mockResolvedValue([makeSdr("b", 4), makeSdr("a", 18), makeSdr("c", 7)]);

    renderWithQuery(<AssistRankingScreen period="all" />);

    const cards = within(await screen.findByRole("list")).getAllByRole("listitem");

    expect(getSdrRanking).toHaveBeenCalledWith("all");
    expect(within(cards[0]).getByText("SDR a")).toBeInTheDocument();
    expect(within(cards[1]).getByText("SDR c")).toBeInTheDocument();
    expect(within(cards[2]).getByText("SDR b")).toBeInTheDocument();
  });

  it("mostra o título sem subtítulo", async () => {
    getSdrRanking.mockResolvedValue([makeSdr("a", 1)]);

    renderWithQuery(<AssistRankingScreen period="all" />);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Ranking deassistências");
    expect(screen.queryByText(/semanal|geral/i)).not.toBeInTheDocument();
  });

  it("avisa quando ninguém fez passagem", async () => {
    getSdrRanking.mockResolvedValue([]);

    renderWithQuery(<AssistRankingScreen period="all" />);

    expect(await screen.findByText("Nenhuma passagem no período")).toBeInTheDocument();
  });
});
