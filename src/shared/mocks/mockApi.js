import {
  findActiveSalesOfCurrentWeek,
  findAllSales,
  findSalesByVendor,
  getCampaigns,
  getForecast,
  getGoalProgress,
  getScoreboard,
  getMe,
  getMyPrizes,
  getMySales,
  getMyTeam,
  getPeoplePoints,
  getPointsHistory,
  getPrizes,
  getPrizeWithdrawals,
  getSdrRanking,
  getVendorRanking,
  MOCK_PERSON,
} from "./mockBackend";
import { buildMockDatabase } from "./mockDatabase";
import { currentMonthKey } from "../../features/goals/utils/goalMath";
import { getGoalHistory, getGoalMonth, getGoalProgress as getMonthlyGoalProgress, getMyGoals } from "./mockGoals";

const MOCK_DELAY = 300;

const toPeriod = (value) => (value === "week" ? "week" : "all");
const toFunnel = (value) => (value === "farm" ? "farm" : "sales");
const toSegment = (value) => (["b2b", "b2g"].includes(String(value ?? "").toLowerCase()) ? String(value).toLowerCase() : null);

const ROUTES = [
  { pattern: /^\/analytics\/goal$/, handle: ({ db }) => getGoalProgress(db) },
  {
    pattern: /^\/analytics\/forecast$/,
    handle: ({ db, now, params }) => getForecast(db, params.segment, now, /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month : null),
  },
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
  { pattern: /^\/prizes$/, handle: ({ db, now, params }) => getPrizes(db, toSegment(params.segment), now) },
  {
    pattern: /^\/prizes\/withdrawals$/,
    handle: ({ db, now, params }) => getPrizeWithdrawals(db, toSegment(params.segment), now),
  },
  {
    pattern: /^\/goals\/(\d{4}-\d{2})\/progress$/,
    handle: ({ db, now, match }) => getMonthlyGoalProgress(db, match[1], now),
  },
  {
    pattern: /^\/goals\/(\d{4}-\d{2})\/history$/,
    handle: ({ db, now, match }) => getGoalHistory(db, match[1], now),
  },
  { pattern: /^\/goals\/(\d{4}-\d{2})$/, handle: ({ db, now, match }) => getGoalMonth(db, match[1], now) },
  { pattern: /^\/me$/, handle: ({ db }) => getMe(db) },
  { pattern: /^\/me\/sales$/, handle: ({ db }) => getMySales(db) },
  { pattern: /^\/me\/prizes$/, handle: ({ db, now }) => getMyPrizes(db, now) },
  {
    pattern: /^\/me\/goals$/,
    handle: ({ db, now, params }) =>
      getMyGoals(db, /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month : currentMonthKey(now), now, MOCK_PERSON.id),
  },
  { pattern: /^\/campaigns$/, handle: ({ db }) => getCampaigns(db) },
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
