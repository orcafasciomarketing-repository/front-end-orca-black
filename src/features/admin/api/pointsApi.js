import { http } from "../../../shared/httpClient.js";

export const getPointsHistory = async (segment) => {
  const params = segment ? { segment: segment.toLowerCase() } : {};
  const response = await http.get("/analytics/points-history", { params });
  return response.data.data;
};
