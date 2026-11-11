import { campaignParams } from "../../campaigns/utils/campaignSelection";
import { http } from "../../../shared/httpClient.js";

const byNewestSale = (a, b) => new Date(b.realizedAt) - new Date(a.realizedAt);

export const getAdminSales = async (vendorId, campaignId = "") => {
  const url = vendorId ? `/sales/get/${vendorId}` : "/sales/admin";
  const response = campaignId ? await http.get(url, { params: campaignParams(campaignId) }) : await http.get(url);
  const { data, total } = response.data.data;

  return { sales: [...data].sort(byNewestSale), total };
};

export const getVendors = async () => {
  const response = await http.get("/vendor/list");
  return response.data.data;
};

const rankingRequest = (path, { period = "all", segment = "", campaign = "" } = {}) => {
  const url = period === "lastWeek" ? `${path}/last-week` : path;
  const params = {
    ...(period === "week" ? { period: "week" } : {}),
    ...(segment ? { segment: segment.toLowerCase() } : {}),
    ...campaignParams(campaign),
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

export const getSdrs = async () => {
  const response = await http.get("/sdr/list");
  return response.data.data;
};

export const getGoal = async (campaignId = "") => {
  const response = campaignId
    ? await http.get("/analytics/goal", { params: campaignParams(campaignId) })
    : await http.get("/analytics/goal");
  return response.data.data;
};

export const getTeams = async (campaignId = "") => {
  const response = await http.get("/analytics/scoreboard", { params: { period: "all", ...campaignParams(campaignId) } });
  return response.data.data.map(({ teamId, teamName }) => ({ teamId, teamName }));
};
