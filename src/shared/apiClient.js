import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Login e refresh nunca disparam refresh no 401 (evita loop infinito e refresh em senha errada).
// O logout passa pelo refresh para garantir que o refresh token seja invalidado mesmo com access token expirado.
const AUTH_ROUTES = ["auth/login", "auth/refresh"];

let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

instance.interceptors.request.use(function attachToken(config) {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export const setAuthInterceptor = (dispatch) => {
  const interceptorId = instance.interceptors.response.use(
    function onSuccess(response) {
      return response;
    },
    async function onInvalidToken(error) {
      const originalRequest = error.config;
      const isAuthRoute = AUTH_ROUTES.some((route) => originalRequest?.url?.includes(route));

      if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshData = await refreshSession();

          originalRequest.headers.Authorization = `Bearer ${refreshData.token}`;
          dispatch({ type: "ALTER_TOKEN", payload: { token: refreshData.token } });

          return instance(originalRequest);
        } catch {
          setAccessToken(null);
          dispatch({ type: "REVOKE_DATA" });
        }
      }

      throw error;
    },
  );

  return () => instance.interceptors.response.eject(interceptorId);
};

// Várias chamadas simultâneas (401s em paralelo, StrictMode) compartilham o mesmo refresh
export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = instance
      .post("/auth/refresh")
      .then((response) => {
        setAccessToken(response.data.token);
        return response.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export default instance;
