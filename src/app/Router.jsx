import { createBrowserRouter } from "react-router";

import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import AdminPanel from "../features/admin/pages/AdminPanel";

const router = createBrowserRouter([
  {
    path: "/admin",
    element: <PrivateRoute />,
    children: [{ index: true, element: <AdminPanel /> }],
  },
  {
    path: "/",
    element: <PublicRoute />,
    children: [{ index: true, element: <LoginPage /> }],
  },
]);

export default router;
