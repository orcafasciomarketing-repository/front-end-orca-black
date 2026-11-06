import { describe, expect, it } from "vitest";

import { cumulativeTeamPoints, summarizeTeamPoints } from "./teamPoints";

const history = {
  days: ["2026-11-03", "2026-11-04", "2026-11-05"],
  teams: [
    {
      teamId: "a",
      teamName: "Alfa",
      teamShirt: "a.png",
      sales: [2, 0, 2],
      farm: [0, 1, 0],
      passage: [1, 0, 0],
      total: [3, 1, 2],
    },
    {
      teamId: "b",
      teamName: "Beta",
      teamShirt: "b.png",
      sales: [0, 6, 0],
      farm: [0, 0, 0],
      passage: [0, 0, 1],
      total: [0, 6, 1],
    },
  ],
};

describe("teamPoints", () => {
  it("soma os pontos de cada equipe por tipo, do maior para o menor", () => {
    expect(summarizeTeamPoints(history, null)).toEqual([
      { key: "b", label: "Beta", imageUrl: "b.png", sales: 6, farm: 0, passage: 1, total: 7 },
      { key: "a", label: "Alfa", imageUrl: "a.png", sales: 4, farm: 1, passage: 1, total: 6 },
    ]);
  });

  it("respeita o período escolhido", () => {
    const summary = summarizeTeamPoints(history, { start: "2026-11-05", end: "2026-11-05" });

    expect(summary.map((team) => [team.label, team.total])).toEqual([
      ["Alfa", 2],
      ["Beta", 1],
    ]);
  });

  it("acumula os pontos dia a dia dentro do período", () => {
    expect(cumulativeTeamPoints(history, { start: "2026-11-04", end: "2026-11-30" })).toEqual({
      days: ["2026-11-04", "2026-11-05"],
      teams: [
        { key: "a", label: "Alfa", values: [1, 3] },
        { key: "b", label: "Beta", values: [6, 7] },
      ],
    });
  });
});
