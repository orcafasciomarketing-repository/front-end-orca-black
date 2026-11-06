import { http } from "../../../shared/httpClient.js";

export const getPointsHistory = async (segment) => {
  const params = segment ? { segment: segment.toLowerCase() } : {};
  const response = await http.get("/analytics/points-history", { params });
  return response.data.data;
};

export const getPeoplePoints = async ({ period = "all", segment = "", from = "", to = "" } = {}) => {
  const params = {
    ...(period !== "all" ? { period } : {}),
    ...(segment ? { segment: segment.toLowerCase() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const response = await http.get("/analytics/people-points", { params });
  return response.data.data;
};
