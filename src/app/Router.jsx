import { createBrowserRouter } from "react-router";

import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";
import RouteErrorScreen from "./RouteErrorScreen";
import LoginPage from "../features/auth/pages/LoginPage";
import AdminLayout from "../features/admin/pages/AdminLayout";
import AdminPanel from "../features/admin/pages/AdminPanel";
import ErrorsPage from "../features/admin/pages/ErrorsPage";
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
          { path: "erros", element: <ErrorsPage /> },
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
