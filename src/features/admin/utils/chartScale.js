const NICE_STEPS = [1, 2, 2.5, 5, 10];

export function niceTicks(maxValue, count = 4) {
  if (!(maxValue > 0)) {
    return [0, 1];
  }

  const rawStep = maxValue / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = NICE_STEPS.find((nice) => nice * magnitude >= rawStep) * magnitude;
  const ticks = [];

  for (let tick = 0; tick < maxValue + step; tick += step) {
    ticks.push(Math.round(tick * 100) / 100);
  }

  return ticks;
}

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactCurrency(value) {
  return compactCurrency.format(value ?? 0);
}

export function formatPassages(value) {
  return `${value} ${value === 1 ? "passagem" : "passagens"}`;
}
