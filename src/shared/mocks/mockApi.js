import {
  findActiveSalesOfCurrentWeek,
  findAllSales,
  findSalesByVendor,
  getGoalProgress,
  getScoreboard,
  getSdrRanking,
  getVendorRanking,
} from "./mockBackend";
import { buildMockDatabase } from "./mockDatabase";

const MOCK_DELAY = 300;

const toPeriod = (value) => (value === "week" ? "week" : "all");
const toFunnel = (value) => (value === "farm" ? "farm" : "sales");

const ROUTES = [
  { pattern: /^\/analytics\/goal$/, handle: ({ db }) => getGoalProgress(db) },
  { pattern: /^\/analytics\/scoreboard\/last-week$/, handle: ({ db, now }) => getScoreboard(db, "lastWeek", now) },
  { pattern: /^\/analytics\/scoreboard$/, handle: ({ db, now, params }) => getScoreboard(db, toPeriod(params.period), now) },
  {
    pattern: /^\/analytics\/ranking\/last-week$/,
    handle: ({ db, now, params }) => getVendorRanking(db, "lastWeek", toFunnel(params.vendorDepartment), now),
  },
  {
    pattern: /^\/analytics\/ranking$/,
    handle: ({ db, now, params }) => getVendorRanking(db, toPeriod(params.period), toFunnel(params.vendorDepartment), now),
  },
  { pattern: /^\/analytics\/sdr-ranking\/last-week$/, handle: ({ db, now }) => getSdrRanking(db, "lastWeek", now) },
  { pattern: /^\/analytics\/sdr-ranking$/, handle: ({ db, now, params }) => getSdrRanking(db, toPeriod(params.period), now) },
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
