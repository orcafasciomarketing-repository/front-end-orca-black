import { describe, expect, it } from "vitest";

import { ALL_TEAMS, peoplePointsRows, rankPeople } from "./peoplePoints";

const points = {
  teams: [
    { teamId: "a", teamName: "Alfa" },
    { teamId: "b", teamName: "Beta" },
  ],
  people: [
    {
      personId: "v1",
      kind: "vendor",
      name: "Bruno",
      job: "B2B Sales",
      teamId: "b",
      sales: 4,
      farm: 1,
      passage: 0,
      total: 5,
    },
    { personId: "s1", kind: "sdr", name: "Carla", job: "CS", teamId: "a", sales: 0, farm: 0, passage: 3, total: 3 },
    {
      personId: "v2",
      kind: "vendor",
      name: "Diego",
      job: "B2G Sales",
      teamId: "a",
      sales: 2,
      farm: 0,
      passage: 0,
      total: 2,
    },
    { personId: "v3", kind: "vendor", name: "Eva", job: null, teamId: null, sales: 0, farm: 0, passage: 0, total: 0 },
  ],
};

describe("peoplePoints", () => {
  it("todas as equipes: mantém a ordem do backend e numera as posições", () => {
    const people = rankPeople(points, ALL_TEAMS);

    expect(people.map((person) => [person.position, person.name, person.teamName])).toEqual([
      [1, "Bruno", "Beta"],
      [2, "Carla", "Alfa"],
      [3, "Diego", "Alfa"],
      [4, "Eva", "Sem equipe"],
    ]);
    expect(people[0].key).toBe("vendor-v1");
    expect(people[1].key).toBe("sdr-s1");
  });

  it("com uma equipe: só as pessoas dela, com as posições recontadas", () => {
    expect(rankPeople(points, "a").map((person) => [person.position, person.name])).toEqual([
      [1, "Carla"],
      [2, "Diego"],
    ]);
  });

  it("equipe sem ninguém devolve lista vazia", () => {
    expect(rankPeople(points, "z")).toEqual([]);
  });

  it("monta as linhas do CSV com a divisão dos pontos", () => {
    expect(peoplePointsRows(rankPeople(points, "a"))).toEqual([
      ["Posição", "Pessoa", "Equipe", "Cargo", "Venda", "Renovação", "Passagem", "Total"],
      ["1º", "Carla", "Alfa", "CS", "0", "0", "3", "3"],
      ["2º", "Diego", "Alfa", "B2G Sales", "2", "0", "0", "2"],
    ]);
  });
});
