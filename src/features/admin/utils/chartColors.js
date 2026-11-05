export const CHART_COLORS = {
  blue: "var(--chart-blue, #2a78d6)",
  orange: "var(--chart-orange, #eb6834)",
  aqua: "var(--chart-aqua, #1baf7a)",
  rest: "var(--chart-rest, #c3c2b7)",
};

const SEGMENT_COLORS = {
  B2B: CHART_COLORS.blue,
  B2G: CHART_COLORS.orange,
};

export const segmentColor = (segment) => SEGMENT_COLORS[segment] ?? CHART_COLORS.aqua;

export const HEAT_LEVELS = 5;

export const heatLevel = (count, max) => (count > 0 && max > 0 ? Math.ceil((count / max) * HEAT_LEVELS) : 0);
