export const dashboardKeys = {
  goal: ["goal"],
  scoreboards: ["scoreboard"],
  scoreboard: (period) => ["scoreboard", period],
  rankings: ["ranking"],
  vendorRanking: (period, department) => ["ranking", "vendor", period, department],
  sdrRanking: (period) => ["ranking", "sdr", period],
  saleVideo: ["sale-video"],
};

export const REFETCH_INTERVAL = 60 * 1000;
