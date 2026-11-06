import api from "../../../shared/apiClient.js";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const assertMockDisabled = () => {
  if (isMockEnabled()) {
    throw new Error("O cadastro de usuários não funciona com os dados de demonstração");
  }
};

// Mensagem do backend (ex.: "Cadastro já realizado") em vez de "Request failed with status code 409"
export const getUserErrorMessage = (error) => error.response?.data?.error ?? error.message;

export const getUsers = async () => {
  if (isMockEnabled()) {
    return [];
  }

  const response = await api.get("/users");
  return response.data.data;
};

// userData: { email, password, passwordConfirmation, role }
export const createUser = async (userData) => {
  assertMockDisabled();

  const response = await api.post("/users", userData);
  return response.data.data;
};

// changes: { role } e/ou { password, passwordConfirmation }
export const updateUser = async ({ id, changes }) => {
  assertMockDisabled();

  const response = await api.patch(`/users/${id}`, changes);
  return response.data.data;
};

export const deleteUser = async (id) => {
  assertMockDisabled();

  await api.delete(`/users/${id}`);
};
