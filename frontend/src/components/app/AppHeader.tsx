import { Link } from "react-router-dom";

import { paths } from "../../routes/paths";
import { UserMenu } from "../auth/UserMenu";
import { Container } from "../ui/Container";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";

export function AppHeader({ label }: { label?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-[10px]">
      <Container className="flex items-center justify-between gap-3 py-3">
        <Link to={paths.dashboard} className="hover:no-underline">
          <Logo markSize={24} className="text-lg text-fg" />
        </Link>

        {label ? (
          <span className="truncate font-mono text-xs text-fg-muted">
            {label}
          </span>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <UserMenu />
          </div>
        )}
      </Container>
    </header>
  );
}
