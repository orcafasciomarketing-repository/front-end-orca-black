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
import ForecastPage from "../features/admin/pages/ForecastPage";
import ImportPage from "../features/admin/pages/ImportPage";
import PrizesPage from "../features/admin/pages/PrizesPage";
import UsersPage from "../features/admin/pages/UsersPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import GoalsProgressPage from "../features/goals/pages/GoalsProgressPage";
import GoalsSetupPage from "../features/goals/pages/GoalsSetupPage";
import CampaignsPage from "../features/campaigns/pages/CampaignsPage";
import MyGoalsPage from "../features/person/pages/MyGoalsPage";
import PersonPage from "../features/person/pages/PersonPage";

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
        element: <RestrictedRoute allow="canSeeAdmin" redirectTo="/minha-area" />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminPanel /> },
              { path: "graficos", element: <ChartsPage /> },
              { path: "previsao", element: <ForecastPage /> },
              { path: "premios", element: <PrizesPage /> },
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
              {
                element: <RestrictedRoute allow="canManageCampaigns" />,
                children: [{ path: "campanhas", element: <CampaignsPage /> }],
              },
              {
                element: <RestrictedRoute allow="canSeeGoals" />,
                children: [
                  { path: "metas", element: <GoalsSetupPage /> },
                  { path: "metas/vendedores", element: <GoalsProgressPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "/minha-area",
    element: <PrivateRoute />,
    errorElement: <RouteErrorScreen />,
    children: [
      {
        element: <RestrictedRoute allow="isPerson" />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <PersonPage /> },
              {
                element: <RestrictedRoute allow="isVendor" redirectTo="/minha-area" />,
                children: [{ path: "metas", element: <MyGoalsPage /> }],
              },
            ],
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
