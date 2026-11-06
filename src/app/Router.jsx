import { createBrowserRouter } from "react-router";

import RestrictedRoute from "./RestrictedRoute";
import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";
import RouteErrorScreen from "./RouteErrorScreen";
import LoginPage from "../features/auth/pages/LoginPage";
import AdminLayout from "../features/admin/pages/AdminLayout";
import AdminPanel from "../features/admin/pages/AdminPanel";
import ChartsPage from "../features/admin/pages/ChartsPage";
import ErrorsPage from "../features/admin/pages/ErrorsPage";
import ImportPage from "../features/admin/pages/ImportPage";
import UsersPage from "../features/admin/pages/UsersPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardPage />,
    errorElement: <RouteErrorScreen />,
  },
  {
    path: "/admin",
    element: <PrivateRoute />,
    errorElement: <RouteErrorScreen />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminPanel /> },
          { path: "graficos", element: <ChartsPage /> },
          {
            element: <RestrictedRoute allow="isMaster" />,
            children: [
              { path: "importacao", element: <ImportPage /> },
              { path: "erros", element: <ErrorsPage /> },
            ],
          },
          {
            element: <RestrictedRoute allow="canSeeUsers" />,
            children: [{ path: "usuarios", element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <PublicRoute />,
    errorElement: <RouteErrorScreen />,
    children: [{ index: true, element: <LoginPage /> }],
  },
]);

export default router;
