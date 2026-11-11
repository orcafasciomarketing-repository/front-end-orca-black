import api from "../../../shared/apiClient.js";
import { http } from "../../../shared/httpClient.js";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const assertMockDisabled = () => {
  if (isMockEnabled()) {
    throw new Error("O cadastro de campanhas não funciona com os dados de demonstração");
  }
};

export const getCampaignErrorMessage = (error) => error.response?.data?.error ?? error.message;

export const getCampaigns = async () => {
  const response = await http.get("/campaigns");
  return response.data.data;
};

export const createCampaign = async (campaign) => {
  assertMockDisabled();

  const response = await api.post("/campaigns", campaign);
  return response.data.data;
};

export const updateCampaign = async (id, campaign) => {
  assertMockDisabled();

  const response = await api.put(`/campaigns/${id}`, campaign);
  return response.data.data;
};

export const deleteCampaign = async (id) => {
  assertMockDisabled();

  await api.delete(`/campaigns/${id}`);
};
