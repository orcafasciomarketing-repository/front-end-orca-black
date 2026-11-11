import { createContext, useReducer, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import authReducer from "./authReducer";
import { impersonateUser, logoutUser } from "../api/authApi";
import { refreshSession, setAccessToken, setAuthInterceptor, setImpersonating } from "../../../shared/apiClient";

const initialValue = {
  user: null,
  token: null,
  impersonatedBy: null,
  isLoading: true,
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export default function AuthContextProvider({ children }) {
  const queryClient = useQueryClient();
  const [authState, authDispatch] = useReducer(authReducer, initialValue);

  useEffect(() => {
    return setAuthInterceptor(authDispatch);
  }, []);

  useEffect(() => {
    async function refreshSessionLocal() {
      try {
        const refreshData = await refreshSession();
        authDispatch({
          type: "SET_USER",
          payload: { user: refreshData.user, token: refreshData.token },
        });
      } catch {
        // Sem sessão válida: o PublicRoute renderiza o login
      } finally {
        authDispatch({ type: "SET_LOADING" });
      }
    }

    refreshSessionLocal();
  }, []);

  async function logout() {
    try {
      await logoutUser();
    } finally {
      authDispatch({ type: "REVOKE_DATA" });
      queryClient.clear();
    }
  }

  async function startImpersonation(userId) {
    const data = await impersonateUser(userId);
    const impersonatedBy = authState.user;
    setAccessToken(data.token);
    setImpersonating(true);
    queryClient.clear();
    authDispatch({ type: "START_IMPERSONATION", payload: { user: data.user, token: data.token, impersonatedBy } });
  }

  async function stopImpersonation() {
    setImpersonating(false);
    queryClient.clear();
    try {
      const data = await refreshSession();
      authDispatch({ type: "END_IMPERSONATION", payload: { user: data.user, token: data.token } });
    } catch {
      setAccessToken(null);
      authDispatch({ type: "REVOKE_DATA" });
    }
  }

  const ctxValue = {
    state: authState,
    dispatch: authDispatch,
    logout,
    startImpersonation,
    stopImpersonation,
  };

  return <AuthContext value={ctxValue}>{children}</AuthContext>;
}
