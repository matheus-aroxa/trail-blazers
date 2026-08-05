import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { paths } from "../../routes/paths";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
      <span className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface p-[5px] sm:py-[5px] sm:pr-3 sm:pl-[5px]">
        <Avatar username={user.username} src={user.avatarUrl} />
        <span className="hidden max-w-[14ch] truncate font-mono text-[12.5px] text-fg sm:inline">
          {user.username}
        </span>
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="flex-none px-2.5 font-medium sm:px-3.5"
        onClick={() => {
          signOut();
          navigate(paths.landing, { replace: true });
        }}
      >
        Sair
      </Button>
    </div>
  );
}
