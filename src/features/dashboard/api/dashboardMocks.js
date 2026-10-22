export const goalMock = {
  goal: 3999495.33,
  total: 1500299.2,
  percent: 37.51,
};

export const scoreboardMock = [
  { teamId: "team-2", teamName: "Tropa do orçamento", teamShirt: null, sales: 92, farm: 40, passage: 18, total: 150 },
  { teamId: "team-3", teamName: "Fecha tudo", teamShirt: null, sales: 85, farm: 41, passage: 14, total: 140 },
  { teamId: "team-1", teamName: "Sem freio", teamShirt: null, sales: 110, farm: 48, passage: 21, total: 179 },
];

const MOCK_PREVIOUS_WEEKS = {
  "team-1": { sales: 210, farm: 95, passage: 40 },
  "team-2": { sales: 260, farm: 110, passage: 52 },
  "team-3": { sales: 180, farm: 70, passage: 31 },
};

const vendorRankingMock = {
  sales: {
    week: [
      { vendorId: "vendor-2", name: "Carla", points: 14 },
      { vendorId: "vendor-1", name: "Bruno", points: 17 },
      { vendorId: "vendor-3", name: "Diego", points: 9 },
    ],
    all: [
      { vendorId: "vendor-3", name: "Diego", points: 41 },
      { vendorId: "vendor-1", name: "Bruno", points: 52 },
      { vendorId: "vendor-2", name: "Carla", points: 47 },
    ],
  },
  farm: {
    week: [
      { vendorId: "vendor-5", name: "Fernanda", points: 8 },
      { vendorId: "vendor-4", name: "Eduardo", points: 11 },
      { vendorId: "vendor-6", name: "Gabriela", points: 6 },
    ],
    all: [
      { vendorId: "vendor-6", name: "Gabriela", points: 29 },
      { vendorId: "vendor-5", name: "Fernanda", points: 33 },
      { vendorId: "vendor-4", name: "Eduardo", points: 24 },
    ],
  },
};

const sdrRankingMock = [
  { sdrId: "sdr-2", name: "Juliana", points: 12 },
  { sdrId: "sdr-1", name: "Henrique", points: 18 },
  { sdrId: "sdr-3", name: "Larissa", points: 7 },
];

const MOCK_DELAY = 400;
const MOCK_EVENT_INTERVAL = 25 * 1000;
const MOCK_POINTS = 20;

let mockScoreboard = scoreboardMock.map((team) => ({ ...team }));

export function withMockDelay(data) {
  return new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY));
}

export function getMockScoreboard(period) {
  if (period !== "all") {
    return mockScoreboard.map((team) => ({ ...team }));
  }

  return mockScoreboard.map((team) => {
    const previous = MOCK_PREVIOUS_WEEKS[team.teamId];
    const sales = team.sales + previous.sales;
    const farm = team.farm + previous.farm;
    const passage = team.passage + previous.passage;

    return { ...team, sales, farm, passage, total: sales + farm + passage };
  });
}

export function getMockVendorRanking(period, department) {
  return vendorRankingMock[department][period].map((vendor) => ({ ...vendor }));
}

export function getMockSdrRanking() {
  return sdrRankingMock.map((sdr) => ({ ...sdr }));
}

const MOCK_SELLERS = [
  { vendorName: "Bruno", job: "Vendedor" },
  { vendorName: "Carla", job: "Vendedora" },
  { vendorName: "Eduardo", job: "Farmer" },
];

const MOCK_ASSISTS = [
  { name: "Juliana", job: "SDR" },
  { name: "Rafael", job: "Suporte" },
  { name: "Larissa", job: "CS" },
];

let mockSaleCount = 0;

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

function changeMockTeamPoints(points) {
  const team = pickRandom(mockScoreboard);

  mockScoreboard = mockScoreboard.map((current) =>
    current.teamId === team.teamId
      ? { ...current, sales: current.sales + points, total: current.total + points }
      : current,
  );

  return team;
}

function createMockSaleEvent() {
  mockSaleCount += 1;
  changeMockTeamPoints(MOCK_POINTS);

  const assist = Math.random() < 0.5 ? pickRandom(MOCK_ASSISTS) : null;

  return {
    sale: { _id: `mock-sale-${mockSaleCount}`, funnelType: pickRandom(["sales", "farm"]), sdrId: assist ? `mock-sdr-${assist.name}` : undefined },
    vendor: { ...pickRandom(MOCK_SELLERS), imageUrl: null },
    ...(assist && { sdr: { ...assist, imageUrl: null } }),
  };
}

export function subscribeToMockSalesEvents(onEvent) {
  const intervalId = setInterval(() => {
    const canceled = Math.random() < 0.3 && mockScoreboard.every((team) => team.sales >= MOCK_POINTS);

    if (canceled) {
      changeMockTeamPoints(-MOCK_POINTS);
      onEvent({ type: "sale-canceled" });
      return;
    }

    const salesAtOnce = Math.random() < 0.3 ? 2 : 1;

    for (let index = 0; index < salesAtOnce; index += 1) {
      onEvent(createMockSaleEvent());
    }
  }, MOCK_EVENT_INTERVAL);

  return () => clearInterval(intervalId);
}
