import { Navigate, Outlet, useLocation } from "react-router";

import useAuth from "../features/auth/hooks/useAuth.js";

export default function PrivateRoute() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.isLoading) {
    return null;
  }

  if (!state.user || !state.token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
