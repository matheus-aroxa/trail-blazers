import { AuthCta } from "../auth/AuthCta";
import { buttonStyles } from "../ui/button-styles";
import { Container } from "../ui/Container";
import { Eyebrow } from "../ui/Eyebrow";
import { sectionIds } from "../../routes/paths";

function CodeSample() {
  return (
    <pre className="overflow-x-auto rounded-md border border-code-border bg-code px-3.5 py-3 font-mono text-xs leading-[1.7] text-slate-300">
      <span className="text-slate-500">{"// api-ecommerce · orders.js"}</span>
      {"\n"}
      for (<span className="text-q-scenario">const</span> order{" "}
      <span className="text-q-scenario">of</span> orders) {"{\n"}
      {"  "}order.items = <span className="text-q-scenario">await</span> Item.
      <span className="text-ember-300">find</span>({"{ orderId: order.id }"});
      {"\n}"}
    </pre>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 188.5;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative size-[72px] flex-none">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="36"
          cy="36"
          r="30"
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth="7"
        />
        <circle
          cx="36"
          cy="36"
          r="30"
          fill="none"
          stroke="var(--color-trail-500)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-ring-draw"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold">
        {score}
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="bg-[radial-gradient(1000px_460px_at_18%_-10%,--alpha(var(--color-trail-500)/13%),transparent_70%)]">
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-14 pt-18 pb-22">
        <div>
          <Eyebrow>Simulador de entrevistas técnicas</Eyebrow>
          <h1 className="mt-4.5 font-display text-[clamp(2.4rem,5.2vw,3.6rem)] leading-[1.1] font-bold tracking-[-0.02em] text-pretty">
            Chegue <span className="text-trail-text">preparado</span> para a
            entrevista técnica.
          </h1>
          <p className="mt-5.5 max-w-[52ch] text-lg text-fg-2 text-pretty">
            O InterviewTrail lê a vaga que você quer, analisa seus repositórios
            do GitHub e monta uma entrevista sob medida — com as perguntas que
            você ouviria de um entrevistador de verdade, sobre o seu código
            real.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <AuthCta />
            <a
              href={`#${sectionIds.howItWorks}`}
              className={buttonStyles("secondary", "lg")}
            >
              Ver como funciona
            </a>
          </div>

          <p className="mt-5.5 font-mono text-[12.5px] text-fg-muted">
            Sem pressão. Só clareza. · Acessamos apenas os repositórios que você
            escolher.
          </p>
        </div>

        <div className="flex w-full max-w-[460px] flex-col justify-self-center py-3">
          <div className="flex -rotate-[1.5deg] flex-col gap-3 rounded-lg border border-border bg-surface p-4.5 shadow-lg">
            <span className="self-start rounded-sm bg-[--alpha(var(--color-q-code)/16%)] px-2.5 py-1 font-mono text-[11px] font-medium tracking-[0.06em] text-ember-text uppercase">
              Análise de código
            </span>
            <CodeSample />
            <p className="text-sm leading-[1.55] text-fg">
              Uma consulta ao banco para cada pedido — o que te levou a essa
              abordagem, e como ela escala com 10&nbsp;mil pedidos?
            </p>
          </div>

          <div className="mt-[-18px] ml-10 flex rotate-[1.4deg] items-center gap-4 self-start rounded-lg border border-border bg-surface px-4.5 py-4 shadow-lg">
            <ScoreRing score={78} />
            <div>
              <div className="font-display text-[15.5px] font-semibold">
                Acima da média júnior
              </div>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[--alpha(var(--color-trail-500)/30%)] bg-[--alpha(var(--color-trail-500)/13%)] px-2.5 py-[3px] text-xs font-semibold text-trail-text">
                Aderência à vaga <span className="font-mono">72%</span>
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
