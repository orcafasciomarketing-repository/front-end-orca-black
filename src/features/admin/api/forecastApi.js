import { http } from "../../../shared/httpClient.js";

// Forecast da campanha e da semana, calculado no backend (GET /analytics/forecast).
// segment "B2B"/"B2G" pede o setor; b2b e b2g recebem sempre o próprio setor
export const getForecast = async (segment) => {
  const params = segment ? { segment: segment.toLowerCase() } : {};
  const response = await http.get("/analytics/forecast", { params });
  return response.data.data;
};
