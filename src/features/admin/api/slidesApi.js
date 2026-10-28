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

export const getRankVendors = async (department) => {
  const response = await http.get("/analytics/ranking", { params: { vendorDepartment: department } });
  return response.data.data.vendor;
};

export const getRankSdrs = async () => {
  const response = await http.get("/analytics/sdr-ranking");
  return response.data.data;
};
