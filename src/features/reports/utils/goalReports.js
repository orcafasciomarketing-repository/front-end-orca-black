import { formatShortDay, STATUS_LABELS, TIER_LABELS } from "../../goals/utils/goalMath";

const PART_LABELS = { farm: "Farmer", sales: "Venda" };
const ratio = (realized, target) => (target > 0 ? realized / target : 0);

const tierColumns = (hasBlack) => [
  { header: "Meta", key: "goal", type: "money" },
  { header: "Super meta", key: "super", type: "money" },
  ...(hasBlack ? [{ header: "Meta black", key: "black", type: "money" }] : []),
];

const tierValues = (tiers) => ({ goal: tiers.goal, super: tiers.super, black: tiers.black });

export const peopleOfSegment = (progress, segment) =>
  progress.people.filter((person) => !segment || person.segment === segment);

export function goalVendorsSheet(progress, segment) {
  const hasBlack = Boolean(progress.black?.active);
  return {
    name: "Vendedores",
    columns: [
      { header: "Vendedor", key: "name" },
      { header: "Setor", key: "segment" },
      { header: "Conta", key: "type" },
      { header: "Nível", key: "level" },
      { header: "Time", key: "team" },
      ...tierColumns(hasBlack),
      { header: "Realizado", key: "realized", type: "money" },
      { header: "% da Meta", key: "percent", type: "percent" },
      { header: "Faixa atual", key: "current" },
      { header: "Falta para a faixa", key: "remaining", type: "money" },
      { header: "Além da última faixa", key: "excess", type: "money" },
      { header: "Situação", key: "status" },
      { header: "Precisa por dia útil", key: "neededPerDay", type: "money" },
      { header: "Vendas que faltam", key: "salesNeeded", type: "integer" },
      { header: "Leads que faltam", key: "leadsNeeded", type: "integer" },
      { header: "Chance da Meta", key: "chance", type: "percent" },
      { header: "Previsão realista", key: "realistic", type: "money" },
    ],
    rows: peopleOfSegment(progress, segment).map((person) => {
      const { month, forecast } = person;
      const chance = forecast?.tiers?.goal?.probability;
      return {
        name: person.name,
        segment: person.segment.toUpperCase(),
        type: PART_LABELS[person.type],
        level: person.levelName ?? "",
        team: person.teamName ?? "Sem time",
        ...tierValues(month.tiers),
        realized: month.realized,
        percent: ratio(month.realized, month.tiers.goal),
        current: TIER_LABELS[month.current],
        remaining: month.remaining,
        excess: month.excess,
        status: STATUS_LABELS[month.pace.status],
        neededPerDay: month.pace.status === "done" ? 0 : month.pace.neededPerDay,
        salesNeeded: month.salesNeeded ?? null,
        leadsNeeded: month.leadsNeeded ?? null,
        chance: chance === null || chance === undefined ? null : chance / 100,
        realistic: forecast?.scenarios?.realistic ?? null,
      };
    }),
  };
}

export function goalWeeksSheet(progress, segment) {
  const hasBlack = Boolean(progress.black?.active);
  return {
    name: "Semanas",
    columns: [
      { header: "Vendedor", key: "name" },
      { header: "Semana", key: "week", width: 24 },
      ...tierColumns(hasBlack),
      { header: "Realizado", key: "realized", type: "money" },
      { header: "Faixa atual", key: "current" },
      { header: "Situação", key: "status" },
    ],
    rows: peopleOfSegment(progress, segment).flatMap((person) =>
      person.weeks.map((week) => ({
        name: person.name,
        week: `Semana ${week.index + 1} · ${formatShortDay(week.start)} a ${formatShortDay(week.end)}`,
        ...tierValues(week.tiers),
        realized: week.realized,
        current: TIER_LABELS[week.current],
        status: STATUS_LABELS[week.pace.status],
      })),
    ),
  };
}

export function goalSegmentsSheet(progress, segment) {
  const hasBlack = Boolean(progress.black?.active);
  const rowOf = (label, part, scope) => ({
    segment: label,
    part,
    ...tierValues(scope.tiers),
    realized: scope.realized,
    percent: ratio(scope.realized, scope.tiers.goal),
  });
  const segments = progress.segments.filter((item) => !segment || item.segment === segment);
  const rows = segments.flatMap((item) => [
    rowOf(item.segment.toUpperCase(), "Total", item.month),
    rowOf(item.segment.toUpperCase(), "Farmer", item.parts.farm),
    rowOf(item.segment.toUpperCase(), "Venda", item.parts.sales),
  ]);
  if (!segment && progress.total) rows.push(rowOf("Todos", "Total", progress.total.month));

  return {
    name: "Setores",
    columns: [
      { header: "Setor", key: "segment" },
      { header: "Parte", key: "part" },
      ...tierColumns(hasBlack),
      { header: "Realizado", key: "realized", type: "money" },
      { header: "% da Meta", key: "percent", type: "percent" },
    ],
    rows,
  };
}

export function goalTeamsSheet(progress, segment) {
  const hasBlack = Boolean(progress.black?.active);
  const people = peopleOfSegment(progress, segment);
  const teams = new Map();
  for (const person of people) {
    const key = person.teamName ?? "Sem time";
    if (!teams.has(key)) teams.set(key, { team: key, members: 0, goal: 0, super: 0, black: 0, realized: 0 });
    const team = teams.get(key);
    team.members += 1;
    team.goal += person.month.tiers.goal;
    team.super += person.month.tiers.super;
    team.black += person.month.tiers.black;
    team.realized += person.month.realized;
  }
  const round = (value) => Math.round(value * 100) / 100;

  return {
    name: "Times",
    columns: [
      { header: "Time", key: "team" },
      { header: "Vendedores", key: "members", type: "integer" },
      ...tierColumns(hasBlack),
      { header: "Realizado", key: "realized", type: "money" },
      { header: "% da Meta", key: "percent", type: "percent" },
    ],
    rows: [...teams.values()]
      .map((team) => ({
        ...team,
        goal: round(team.goal),
        super: round(team.super),
        black: round(team.black),
        realized: round(team.realized),
        percent: ratio(team.realized, team.goal),
      }))
      .sort((a, b) => b.percent - a.percent),
  };
}

export const goalSheets = (progress, segment) => [
  goalVendorsSheet(progress, segment),
  goalWeeksSheet(progress, segment),
  goalSegmentsSheet(progress, segment),
  goalTeamsSheet(progress, segment),
];
