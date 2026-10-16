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
