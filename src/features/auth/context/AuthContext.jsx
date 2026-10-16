import { createContext, useReducer, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import authReducer from "./authReducer";
import { logoutUser } from "../api/authApi";
import { refreshSession, setAuthInterceptor } from "../../../shared/apiClient";

const initialValue = {
  user: null,
  token: null,
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

  const ctxValue = {
    state: authState,
    dispatch: authDispatch,
    logout,
  };

  return <AuthContext value={ctxValue}>{children}</AuthContext>;
}
