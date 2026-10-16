import { Navigate, Outlet, useLocation } from "react-router";

import useAuth from "../features/auth/hooks/useAuth.js";

import styles from "./PublicRoute.module.css";

export default function PublicRoute() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.isLoading) {
    return null;
  }

  if (state.user && state.token) {
    const redirectTo = location.state?.from?.pathname ?? "/admin";
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <section className="container">
      <Outlet />
    </section>
  );
}
