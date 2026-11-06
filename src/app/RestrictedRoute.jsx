import { Navigate, Outlet } from "react-router";

import usePermissions from "../features/auth/hooks/usePermissions";

// allow: permissão de getPermissions que libera as rotas filhas ("isMaster" ou "canSeeUsers").
// Sem ela, volta para o dashboard
export default function RestrictedRoute({ allow }) {
  const permissions = usePermissions();

  if (!permissions[allow]) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
