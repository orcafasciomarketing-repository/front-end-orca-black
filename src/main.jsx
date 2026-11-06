import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AuthContextProvider from "./features/auth/context/AuthContext";
import ThemeContextProvider from "./shared/context/ThemeContext";
import router from "./app/Router";
import { installGlobalErrorHandlers } from "./shared/errorLogger";

import "./shared/styles/global.css";

installGlobalErrorHandlers();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <ThemeContextProvider>
          <RouterProvider router={router} />
        </ThemeContextProvider>
      </AuthContextProvider>
    </QueryClientProvider>
  </StrictMode>,
);
