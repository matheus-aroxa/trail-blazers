import { cn } from "../../lib/cn";
import { trailSteps } from "../../content/trail-steps";

export function OnboardingSteps({ className }: { className?: string }) {
  return (
    <ol
      className={cn(
        "grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-5 p-0 text-left",
        className,
      )}
    >
      {trailSteps.map((step) => (
        <li
          key={step.number}
          className="flex gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <span
            className={cn(
              "flex size-8 flex-none items-center justify-center rounded-full border-2",
              "font-mono text-xs font-semibold",
              step.tone === "trail"
                ? "border-trail-500 text-trail-text"
                : "border-ember-400 text-ember-text",
            )}
          >
            {step.number}
          </span>
          <div>
            <h4 className="mb-1 font-display text-[15px] font-semibold">
              {step.title}
            </h4>
            <p className="text-[13.5px] leading-[1.5] text-fg-2">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
