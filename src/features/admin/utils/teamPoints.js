const POINT_KINDS = ["sales", "farm", "passage"];

const indexesInPeriod = (days, period) =>
  days.map((day, index) => (!period || (day >= period.start && day <= period.end) ? index : -1)).filter((i) => i >= 0);

export function summarizeTeamPoints(history, period) {
  const indexes = indexesInPeriod(history.days, period);
  const sumOf = (values) => indexes.reduce((total, index) => total + values[index], 0);

  return history.teams
    .map((team) => {
      const totals = Object.fromEntries(POINT_KINDS.map((kind) => [kind, sumOf(team[kind])]));
      return {
        key: String(team.teamId),
        label: team.teamName,
        imageUrl: team.teamShirt,
        ...totals,
        total: totals.sales + totals.farm + totals.passage,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
}

export function cumulativeTeamPoints(history, period) {
  const indexes = indexesInPeriod(history.days, period);

  return {
    days: indexes.map((index) => history.days[index]),
    teams: history.teams.map((team) => {
      let running = 0;
      return {
        key: String(team.teamId),
        label: team.teamName,
        values: indexes.map((index) => (running += team.total[index])),
      };
    }),
  };
}
