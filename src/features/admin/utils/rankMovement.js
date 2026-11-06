export function withMovement(current, previous, idOf) {
  const previousPosition = new Map(previous.map((item, index) => [idOf(item), index]));

  return current.map((item, index) => {
    const before = previousPosition.get(idOf(item));

    if (before === undefined) {
      return { ...item, movement: { type: "new" } };
    }

    if (before === index) {
      return { ...item, movement: { type: "same" } };
    }

    return { ...item, movement: { type: before > index ? "up" : "down", by: Math.abs(before - index) } };
  });
}

export const RANK_PERIODS = [
  { value: "all", label: "Campanha" },
  { value: "week", label: "Esta semana" },
  { value: "lastWeek", label: "Semana passada" },
];
