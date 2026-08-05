import { useAuth } from "../../auth/useAuth";
import { UserMenu } from "../auth/UserMenu";
import { ButtonLink } from "../ui/Button";
import { buttonStyles } from "../ui/button-styles";
import { Container } from "../ui/Container";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { GitHubIcon } from "../ui/icons";
import { paths, sectionIds } from "../../routes/paths";

export function LandingHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-[10px]">
      <Container className="flex items-center justify-between gap-3 py-3.5">
        <Logo className="text-lg sm:text-xl" />

        <nav className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <div className="hidden md:block">
            <a
              href={`#${sectionIds.howItWorks}`}
              className={buttonStyles("ghost", "sm", "font-medium")}
            >
              Como funciona
            </a>
          </div>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <ButtonLink to={paths.login} variant="secondary" size="sm">
              <GitHubIcon />
              Entrar
            </ButtonLink>
          )}
        </nav>
      </Container>
    </header>
  );
}
