import api from "../../../shared/apiClient.js";

export const getAllSlides = async () => {
  const response = await api.get("/sales/admin");
  console.log(response);
  return response.data;
};

export const getRankVendors = async () => {
  const response = await api.get("/analytics/ranking");
  console.log(response);
  return response.data;
};
