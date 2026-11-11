import { http } from "../../../shared/httpClient.js";

export const getMe = async () => {
  const response = await http.get("/me");
  return response.data.data;
};

export const getMySales = async () => {
  const response = await http.get("/me/sales");
  return response.data.data;
};

export const getMyTeam = async (period = "all") => {
  const params = period !== "all" ? { period } : {};
  const response = await http.get("/me/team", { params });
  return response.data.data;
};

export const getMyGoals = async (month) => {
  const response = await http.get("/me/goals", { params: { month } });
  return response.data.data;
};

export const getMyPrizes = async () => {
  const response = await http.get("/me/prizes");
  return response.data.data;
};
