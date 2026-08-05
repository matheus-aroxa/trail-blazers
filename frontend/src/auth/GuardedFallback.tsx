import { Navigate } from "react-router-dom";

import { UnderConstructionPage } from "../pages/UnderConstructionPage";
import { paths } from "../routes/paths";
import { useAuth } from "./useAuth";

export function GuardedFallback() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={paths.landing} replace={true} />;
  }

  return <UnderConstructionPage />;
}
