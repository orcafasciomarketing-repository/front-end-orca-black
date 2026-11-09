import api from "../../../shared/apiClient.js";
import { http } from "../../../shared/httpClient.js";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const assertMockDisabled = () => {
  if (isMockEnabled()) {
    throw new Error("O registro de prêmios não funciona com os dados de demonstração");
  }
};

// Mensagem do backend (ex.: "Fulano tem saldo de 0 prêmios...") em vez de "Request failed with status code 409"
export const getPrizeErrorMessage = (error) => error.response?.data?.error ?? error.message;

// Saldo de cada pessoa. b2b/b2g sempre recebem o próprio setor (o backend ignora o parâmetro)
export const getPrizes = async (segment = "") => {
  const params = segment ? { segment: segment.toLowerCase() } : {};
  const response = await http.get("/prizes", { params });
  return response.data.data;
};

export const getPrizeWithdrawals = async (segment = "") => {
  const params = segment ? { segment: segment.toLowerCase() } : {};
  const response = await http.get("/prizes/withdrawals", { params });
  return response.data.data;
};

// withdrawal: { personId, kind, quantity, withdrawnAt, confirmOverBalance? }
export const createPrizeWithdrawal = async (withdrawal) => {
  assertMockDisabled();

  const response = await api.post("/prizes/withdrawals", withdrawal);
  return response.data.data;
};

export const deletePrizeWithdrawal = async (id) => {
  assertMockDisabled();

  await api.delete(`/prizes/withdrawals/${id}`);
};
