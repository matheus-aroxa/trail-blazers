import { AppHeader } from "@components/app/AppHeader";
import { cn } from "@lib/cn";

export function MockBanner({ screen }: { screen: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 px-3 py-1.5 text-center sm:px-4 sm:py-2",
        "border-b border-[--alpha(var(--color-ember-400)/45%)]",
        "bg-[repeating-linear-gradient(135deg,--alpha(var(--color-ember-400)/16%)_0_10px,--alpha(var(--color-ember-400)/8%)_10px_20px)]",
      )}
    >
      <span className="rounded-sm bg-ember-400 px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-on-ember uppercase">
        Mock
      </span>
      <span className="font-mono text-[10.5px] leading-snug text-fg sm:text-[11.5px]">
        Tela de demonstração — {screen} com dados fictícios, sem integração com
        o backend.
      </span>
    </div>
  );
}

export function MockScreenHeader({
  screen,
  label,
}: {
  screen: string;
  label?: string;
}) {
  return (
    <div className="sticky top-0 z-30">
      <MockBanner screen={screen} />
      <AppHeader label={label} />
    </div>
  );
}

export function MockTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[--alpha(var(--color-ember-400)/45%)]",
        "bg-[--alpha(var(--color-ember-400)/16%)] px-2.5 py-1",
        "font-mono text-[10.5px] font-semibold tracking-[0.08em] text-ember-text uppercase",
        className,
      )}
    >
      Mock · dados fictícios
    </span>
  );
}
