import { Navigate, Outlet, useLocation } from "react-router-dom";

import { paths } from "../routes/paths";
import { useAuth } from "./useAuth";

export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to={paths.login} state={{ from: location }} replace={true} />
    );
  }

  return <Outlet />;
}
