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

const decimalFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const COMPACT_UNITS = [
  { size: 1e9, suffix: " bi" },
  { size: 1e6, suffix: " mi" },
  { size: 1e3, suffix: " mil" },
];

export function formatCompactCurrency(value) {
  const amount = value ?? 0;
  const unit = COMPACT_UNITS.find(({ size }) => Math.abs(amount) >= size);
  const number = unit ? decimalFormatter.format(amount / unit.size) + unit.suffix : decimalFormatter.format(amount);

  return `R$ ${number}`;
}

export function formatCompactNumber(value) {
  const amount = value ?? 0;
  const unit = COMPACT_UNITS.find(({ size }) => Math.abs(amount) >= size);

  return unit ? decimalFormatter.format(amount / unit.size) + unit.suffix : decimalFormatter.format(amount);
}

export function formatPassages(value) {
  return `${value} ${value === 1 ? "passagem" : "passagens"}`;
}

const percentFormatter = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export function formatPercent(value) {
  return percentFormatter.format(value ?? 0);
}

const variationFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatVariation(value) {
  return variationFormatter.format(value);
}

export function formatSalesCount(value) {
  return `${value} ${value === 1 ? "venda" : "vendas"}`;
}
