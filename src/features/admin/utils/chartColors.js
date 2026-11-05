export const CHART_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
};

const SEGMENT_COLORS = {
  B2B: CHART_COLORS.blue,
  B2G: CHART_COLORS.orange,
};

export const segmentColor = (segment) => SEGMENT_COLORS[segment] ?? CHART_COLORS.aqua;
