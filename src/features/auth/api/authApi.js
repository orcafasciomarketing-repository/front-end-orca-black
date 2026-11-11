import api, { setAccessToken } from "../../../shared/apiClient";

export const loginUser = async (formData) => {
  const response = await api.post("/auth/login", formData);
  setAccessToken(response.data.token);
  return response.data;
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
};

export const changePassword = async ({ currentPassword, password, passwordConfirmation }) => {
  const response = await api.post("/auth/change-password", { currentPassword, password, passwordConfirmation });
  setAccessToken(response.data.token);
  return response.data;
};

export const impersonateUser = async (userId) => {
  const response = await api.post(`/auth/impersonate/${userId}`);
  return response.data;
};

export const getAuthErrorMessage = (error) => error.response?.data?.error ?? error.message;
