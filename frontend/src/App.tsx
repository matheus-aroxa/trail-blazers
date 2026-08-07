import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { GuardedFallback } from "./auth/GuardedFallback";
import { RedirectIfAuthenticated } from "./auth/RedirectIfAuthenticated";
import { RequireAuth } from "./auth/RequireAuth";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
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

            <Route element={<RequireAuth />}>
              <Route path={paths.dashboard} element={<DashboardPage />} />

              <Route path={paths.newInterview} element={<JobDescriptionPage />} />
              <Route path={paths.repoChooser} element={<RepositoryChooserPage />} />
              <Route path={paths.interview} element={<InterviewPage />} />
              <Route path={`${paths.report}/:sessionId?`} element={<ReportPage />} />
            </Route>

            <Route path="*" element={<GuardedFallback />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
