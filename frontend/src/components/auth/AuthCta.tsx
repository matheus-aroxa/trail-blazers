import { useAuth } from "../../auth/useAuth";
import { paths } from "../../routes/paths";
import { ButtonLink } from "../ui/Button";
import { GitHubIcon } from "../ui/icons";
import type { ButtonSize } from "../ui/button-styles";

export function AuthCta({
  size = "lg",
  className,
}: {
  size?: ButtonSize;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <ButtonLink to={paths.dashboard} size={size} className={className}>
        Ir para o dashboard
      </ButtonLink>
    );
  }

  return (
    <ButtonLink to={paths.login} size={size} className={className}>
      <GitHubIcon size={18} />
      Entrar com GitHub
    </ButtonLink>
  );
}
