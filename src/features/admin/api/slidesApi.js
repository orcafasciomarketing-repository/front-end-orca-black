import { http } from "../../../shared/httpClient.js";

const byNewestSale = (a, b) => new Date(b.realizedAt) - new Date(a.realizedAt);

export const getAdminSales = async (vendorId) => {
  const url = vendorId ? `/sales/get/${vendorId}` : "/sales/admin";
  const response = await http.get(url);
  const { data, total } = response.data.data;

  return { sales: [...data].sort(byNewestSale), total };
};

export const getVendors = async () => {
  const response = await http.get("/vendor/list");
  return response.data.data;
};

const rankingRequest = (path, { period = "all", segment = "" } = {}) => {
  const url = period === "lastWeek" ? `${path}/last-week` : path;
  const params = {
    ...(period === "week" ? { period: "week" } : {}),
    ...(segment ? { segment: segment.toLowerCase() } : {}),
  };

  return { url, params };
};

export const getRankVendors = async (department, options) => {
  const { url, params } = rankingRequest("/analytics/ranking", options);
  const response = await http.get(url, { params: { vendorDepartment: department, ...params } });
  return response.data.data.vendor;
};

export const getRankSdrs = async (options) => {
  const { url, params } = rankingRequest("/analytics/sdr-ranking", options);
  const response =
    url === "/analytics/sdr-ranking" && Object.keys(params).length === 0
      ? await http.get(url)
      : await http.get(url, { params });
  return response.data.data;
};

export const getGoal = async () => {
  const response = await http.get("/analytics/goal");
  return response.data.data;
};

export const getTeams = async () => {
  const response = await http.get("/analytics/scoreboard", { params: { period: "all" } });
  return response.data.data.map(({ teamId, teamName }) => ({ teamId, teamName }));
};
