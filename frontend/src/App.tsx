import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { RedirectIfAuthenticated } from "./auth/RedirectIfAuthenticated";
import { RequireAuth } from "./auth/RequireAuth";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { UnderConstructionPage } from "./pages/UnderConstructionPage";
import { InterviewPage } from "@pages/InterviewPage";
import { JobDescriptionPage } from "@pages/JobDescriptionPage";
import { ReportPage } from "@pages/ReportPage";
import { RepositoryChooserPage } from "@pages/RepositoryChooserPage";
import { ThemeProvider } from "./theme/ThemeProvider";
import { paths } from "./routes/paths";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path={paths.landing} element={<LandingPage />} />
            <Route path={paths.authCallback} element={<AuthCallbackPage />} />

            <Route element={<RedirectIfAuthenticated />}>
              <Route path={paths.login} element={<LoginPage />} />
            </Route>

            {/* Rotas privadas (RF-1.3). */}
            <Route element={<RequireAuth />}>
              <Route path={paths.dashboard} element={<DashboardPage />} />

              {/* Fluxo da entrevista: as etapas 1 e 2 conversam com o backend. */}
              <Route path={paths.newInterview} element={<JobDescriptionPage />} />
              <Route path={paths.repoChooser} element={<RepositoryChooserPage />} />
              <Route path={paths.interview} element={<InterviewPage />} />
              <Route path={paths.report} element={<ReportPage />} />
            </Route>

            <Route path="*" element={<UnderConstructionPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
