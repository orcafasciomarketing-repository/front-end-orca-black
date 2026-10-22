import { useEffect } from "react";
import { isRouteErrorResponse, useLocation, useRouteError } from "react-router";

import ErrorScreen from "../shared/components/ErrorScreen/ErrorScreen";
import { reportError } from "../shared/errorLogger";

export default function RouteErrorScreen() {
  const routeError = useRouteError();
  const { pathname } = useLocation();
  const location = `Rota ${pathname}`;
  const isResponse = isRouteErrorResponse(routeError);
  const error = isResponse ? new Error(`${routeError.status} ${routeError.statusText}`) : routeError;

  useEffect(() => {
    if (!isResponse) {
      reportError(routeError, { location });
    }
  }, [routeError, isResponse, location]);

  return (
    <section className="container">
      <ErrorScreen error={error} location={location} onRetry={() => window.location.reload()} />
    </section>
  );
}
