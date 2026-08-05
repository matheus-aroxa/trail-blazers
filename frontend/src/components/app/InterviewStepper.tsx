import { cn } from "@lib/cn";
import { CheckIcon } from "@components/ui/icons";

const steps = ["Vaga", "Repositórios", "Entrevista", "Relatório"] as const;

const progressByStep = ["0%", "34%", "67%", "100%"];

interface InterviewStepperProps {
  current: number;
  className?: string;
}

export function InterviewStepper({ current, className }: InterviewStepperProps) {
  return (
    <ol
      aria-label={`Etapa ${current} de ${steps.length}: ${steps[current - 1]}`}
      className={cn(
        "relative mx-auto flex max-w-[560px] list-none justify-between p-0",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute top-5 right-[22px] left-[22px] h-[3px] rounded-sm bg-border"
      >
        <div
          className="absolute top-0 left-0 h-full rounded-sm bg-[linear-gradient(90deg,var(--color-trail-500),var(--color-ember-400))]"
          style={{ width: progressByStep[current - 1] }}
        />
      </div>

      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;

        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="relative z-1 flex w-11 flex-col items-center gap-2"
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full border-2",
                "font-mono text-[12.5px] font-semibold",
                done && "border-trail-500 bg-trail-500 text-on-trail",
                active &&
                  "border-ember-400 bg-bg text-ember-text shadow-[0_0_0_5px_--alpha(var(--color-ember-400)/15%)]",
                !done && !active && "border-border bg-bg text-fg-muted",
              )}
            >
              {done ? (
                <CheckIcon size={14} />
              ) : (
                String(number).padStart(2, "0")
              )}
            </span>

            <span
              className={cn(
                "text-[12.5px] whitespace-nowrap",
                active
                  ? "font-semibold text-fg"
                  : done
                    ? "text-fg-2"
                    : "text-fg-muted",
                !active && "hidden sm:block",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
