export const ALL_TEAMS = "";

export function rankPeople(points, teamId = ALL_TEAMS) {
  const teamNames = new Map(points.teams.map((team) => [String(team.teamId), team.teamName]));

  return points.people
    .filter((person) => teamId === ALL_TEAMS || String(person.teamId) === teamId)
    .map((person, index) => ({
      ...person,
      key: `${person.kind}-${person.personId}`,
      position: index + 1,
      teamName: teamNames.get(String(person.teamId)) ?? "Sem equipe",
    }));
}

export function peoplePointsRows(people) {
  return [
    ["Posição", "Pessoa", "Equipe", "Cargo", "Venda", "Renovação", "Passagem", "Total"],
    ...people.map((person) => [
      `${person.position}º`,
      person.name,
      person.teamName,
      person.job ?? "",
      String(person.sales),
      String(person.farm),
      String(person.passage),
      String(person.total),
    ]),
  ];
}
