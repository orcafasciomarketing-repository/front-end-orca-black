import { Navigate, Outlet } from "react-router";

import usePermissions from "../features/auth/hooks/usePermissions";

// Telas só do admin (importação, erros, usuários): b2b e b2g voltam para o dashboard
export default function AdminOnlyRoute() {
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
