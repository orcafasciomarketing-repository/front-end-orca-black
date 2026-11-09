import {
  findActiveSalesOfCurrentWeek,
  findAllSales,
  findSalesByVendor,
  getForecast,
  getGoalProgress,
  getScoreboard,
  getMe,
  getMySales,
  getMyTeam,
  getPeoplePoints,
  getPointsHistory,
  getSdrRanking,
  getVendorRanking,
} from "./mockBackend";
import { buildMockDatabase } from "./mockDatabase";

const MOCK_DELAY = 300;

const toPeriod = (value) => (value === "week" ? "week" : "all");
const toFunnel = (value) => (value === "farm" ? "farm" : "sales");
const toSegment = (value) => (["b2b", "b2g"].includes(String(value ?? "").toLowerCase()) ? String(value).toLowerCase() : null);

const ROUTES = [
  { pattern: /^\/analytics\/goal$/, handle: ({ db }) => getGoalProgress(db) },
  { pattern: /^\/analytics\/forecast$/, handle: ({ db, now, params }) => getForecast(db, params.segment, now) },
  { pattern: /^\/analytics\/scoreboard\/last-week$/, handle: ({ db, now }) => getScoreboard(db, "lastWeek", now) },
  { pattern: /^\/analytics\/scoreboard$/, handle: ({ db, now, params }) => getScoreboard(db, toPeriod(params.period), now) },
  {
    pattern: /^\/analytics\/ranking\/last-week$/,
    handle: ({ db, now, params }) =>
      getVendorRanking(db, "lastWeek", toFunnel(params.vendorDepartment), now, toSegment(params.segment)),
  },
  {
    pattern: /^\/analytics\/ranking$/,
    handle: ({ db, now, params }) =>
      getVendorRanking(db, toPeriod(params.period), toFunnel(params.vendorDepartment), now, toSegment(params.segment)),
  },
  {
    pattern: /^\/analytics\/sdr-ranking\/last-week$/,
    handle: ({ db, now, params }) => getSdrRanking(db, "lastWeek", now, toSegment(params.segment)),
  },
  {
    pattern: /^\/analytics\/sdr-ranking$/,
    handle: ({ db, now, params }) => getSdrRanking(db, toPeriod(params.period), now, toSegment(params.segment)),
  },
  {
    pattern: /^\/analytics\/points-history$/,
    handle: ({ db, now, params }) => getPointsHistory(db, params.segment, now),
  },
  {
    pattern: /^\/analytics\/people-points$/,
    handle: ({ db, now, params }) =>
      getPeoplePoints(
        db,
        {
          period: ["week", "lastWeek"].includes(params.period) ? params.period : "all",
          segment: toSegment(params.segment),
          from: params.from ?? null,
          to: params.to ?? null,
        },
        now,
      ),
  },
  { pattern: /^\/me$/, handle: ({ db }) => getMe(db) },
  { pattern: /^\/me\/sales$/, handle: ({ db }) => getMySales(db) },
  {
    pattern: /^\/me\/team$/,
    handle: ({ db, now, params }) =>
      getMyTeam(db, ["week", "lastWeek"].includes(params.period) ? params.period : "all", now),
  },
  { pattern: /^\/sales\/admin$/, handle: ({ db }) => findAllSales(db) },
  { pattern: /^\/sales\/get$/, handle: ({ db, now }) => findActiveSalesOfCurrentWeek(db, now) },
  { pattern: /^\/sales\/get\/([^/]+)$/, handle: ({ db, match }) => findSalesByVendor(db, match[1]) },
  { pattern: /^\/vendor\/list$/, handle: ({ db }) => db.vendors },
  { pattern: /^\/sdr\/list$/, handle: ({ db }) => db.sdrs },
];

export function resolveMockRequest(url, params = {}, now = new Date()) {
  const db = buildMockDatabase(now);

  for (const route of ROUTES) {
    const match = url.match(route.pattern);
    if (match) {
      return { status: 200, data: { success: true, data: route.handle({ db, now, params, match }), message: "Mock" } };
    }
  }

  return { status: 404, data: { error: `Rota ${url} não existe nos mocks` } };
}

export const mockApi = {
  get(url, config = {}) {
    const response = resolveMockRequest(url, config.params);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (response.status === 200) {
          resolve(response);
          return;
        }

        const error = new Error(`Request failed with status code ${response.status}`);
        error.response = response;
        reject(error);
      }, MOCK_DELAY);
    });
  },
};

export function subscribeToMockSalesEvents() {
  return () => {};
}
