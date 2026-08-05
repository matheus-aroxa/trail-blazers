import { ButtonLink } from "../ui/Button";
import { paths } from "../../routes/paths";
import { OnboardingSteps } from "./OnboardingSteps";

function EmptyTrailMark({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 21 L11 13 L15 16 L21 6"
        stroke="var(--color-trail-400)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2.5 3"
      />
      <circle cx="5" cy="21" r="2.2" fill="var(--color-trail-400)" />
      <circle
        cx="11"
        cy="13"
        r="2.2"
        fill="var(--color-trail-400)"
        opacity="0.55"
      />
      <circle
        cx="15"
        cy="16"
        r="2.2"
        fill="var(--color-ember-400)"
        opacity="0.55"
      />
      <circle
        cx="21"
        cy="6"
        r="2.2"
        fill="var(--color-ember-400)"
        opacity="0.4"
      />
    </svg>
  );
}

export function EmptyTrail() {
  return (
    <div className="mt-7 flex flex-col items-center rounded-xl border border-dashed border-border bg-[radial-gradient(500px_220px_at_50%_0%,--alpha(var(--color-trail-500)/7%),transparent_70%)] px-8 py-16 text-center">
      <EmptyTrailMark />

      <h2 className="mt-5 mb-2.5 font-display text-2xl font-semibold tracking-[-0.02em]">
        Sua trilha começa aqui.
      </h2>
      <p className="mb-8 max-w-[46ch] text-[15px] text-fg-2">
        Cole a vaga que você quer, escolha seus repositórios e receba um
        diagnóstico honesto. A primeira entrevista leva uns vinte minutos.
      </p>

      <OnboardingSteps className="mb-9 w-full max-w-[720px]" />

      <ButtonLink to={paths.newInterview} size="lg">
        Criar minha primeira entrevista
      </ButtonLink>
    </div>
  );
}
