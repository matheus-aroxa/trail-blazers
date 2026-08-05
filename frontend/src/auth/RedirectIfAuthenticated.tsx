import { Navigate, Outlet } from "react-router-dom";

import { paths } from "../routes/paths";
import { useAuth } from "./useAuth";

export function RedirectIfAuthenticated() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={paths.dashboard} replace={true} />;
  }

  return <Outlet />;
}
