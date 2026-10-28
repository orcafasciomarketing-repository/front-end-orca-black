import api from "./apiClient.js";
import { mockApi } from "./mocks/mockApi";
import { isMockEnabled } from "./utils/isMockEnabled";

export const http = {
  get: (...args) => (isMockEnabled() ? mockApi.get(...args) : api.get(...args)),
};
