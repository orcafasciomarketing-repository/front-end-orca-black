import { campaignParams } from "../../campaigns/utils/campaignSelection";
import { http } from "../../../shared/httpClient.js";

export const getPointsHistory = async (segment, campaign = "") => {
  const params = { ...(segment ? { segment: segment.toLowerCase() } : {}), ...campaignParams(campaign) };
  const response = await http.get("/analytics/points-history", { params });
  return response.data.data;
};

export const getPeoplePoints = async ({ period = "all", segment = "", from = "", to = "", campaign = "" } = {}) => {
  const params = {
    ...campaignParams(campaign),
    ...(period !== "all" ? { period } : {}),
    ...(segment ? { segment: segment.toLowerCase() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const response = await http.get("/analytics/people-points", { params });
  return response.data.data;
};
