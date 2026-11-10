import api from "../../../shared/apiClient.js";
import { http } from "../../../shared/httpClient.js";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const assertMockDisabled = () => {
  if (isMockEnabled()) {
    throw new Error("O cadastro de metas não funciona com os dados de demonstração");
  }
};

export const getGoalErrorMessage = (error) => error.response?.data?.error ?? error.message;

export const getGoalMonth = async (month) => {
  const response = await http.get(`/goals/${month}`);
  return response.data.data;
};

export const getGoalProgress = async (month) => {
  const response = await http.get(`/goals/${month}/progress`);
  return response.data.data;
};

export const getGoalHistory = async (month) => {
  const response = await http.get(`/goals/${month}/history`);
  return response.data.data;
};

export const saveGoalMonth = async (month, segment, payload) => {
  assertMockDisabled();

  const response = await api.put(`/goals/${month}/${segment}`, payload);
  return response.data.data;
};

export const deleteGoalMonth = async (month, segment) => {
  assertMockDisabled();

  await api.delete(`/goals/${month}/${segment}`);
};
