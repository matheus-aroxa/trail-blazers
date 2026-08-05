import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { consumeRedirectAfterLogin } from "../auth/github-oauth";
import { useAuth } from "../auth/useAuth";
import { Spinner } from "../components/ui/Spinner";
import { paths } from "../routes/paths";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    if (handled.current) {
      return;
    }
    handled.current = true;

    const goToLogin = (reason: string) =>
      navigate(`${paths.login}?erro=${encodeURIComponent(reason)}`, {
        replace: true,
      });

    if (error) {
      goToLogin(error);
      return;
    }

    if (!token) {
      goToLogin("sem_token");
      return;
    }

    if (!signIn(token)) {
      goToLogin("token_invalido");
      return;
    }

    navigate(consumeRedirectAfterLogin() ?? paths.dashboard, { replace: true });
  }, [error, token, signIn, navigate]);

  return (
    <div className="flex min-h-screen animate-rise flex-col items-center justify-center gap-5 p-6 text-center">
      <Spinner label="Conectando ao GitHub" />
      <p className="font-mono text-sm text-fg">Conectando ao GitHub…</p>
      <p className="text-[13.5px] text-fg-muted">
        Autenticando e listando os repositórios autorizados.
      </p>
    </div>
  );
}
