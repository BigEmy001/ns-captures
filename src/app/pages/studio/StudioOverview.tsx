import { Link } from "react-router";
import { AlertCircle, ArrowUpRight, CheckCircle2, Circle, PencilLine } from "lucide-react";
import {
  editionReviewStatus,
  type DepositGateConfig,
  type DigitalEdition,
  type EditionReviewStatus,
} from "../../data/editions";
import { monoLabelClass } from "../../components/editions/editionsFormat";
import {
  formatGbpWhole,
  smallSecondaryButton,
  surfaceCardClass,
} from "../../components/editions/studioFormat";
import type { StudioData, StudioSection } from "./studioData";

type Step = {
  done: boolean;
  title: string;
  body: string;
  action?: { label: string; to?: string; external?: boolean; onClick?: () => void };
};

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${surfaceCardClass} p-4`}>
      <p className={monoLabelClass}>{label}</p>
      <p className="mt-2 font-mono text-2xl font-medium text-(--ed-text)">{value}</p>
      {hint && <p className="mt-1 text-xs text-(--ed-muted)">{hint}</p>}
    </div>
  );
}

const actionClass =
  "inline-flex shrink-0 items-center gap-1 self-center text-sm font-medium text-(--ed-primary) hover:underline";

export function StudioOverview({
  data,
  hasWallet,
  depositMet,
  depositConfig,
  onNavigate,
  onEdit,
}: {
  data: StudioData;
  hasWallet: boolean;
  depositMet: boolean;
  depositConfig: DepositGateConfig;
  onNavigate: (section: StudioSection) => void;
  onEdit: (edition: DigitalEdition) => void;
}) {
  const { editions, profile, sales } = data;
  const withStatus = (status: EditionReviewStatus) =>
    editions.filter((e) => editionReviewStatus(e) === status);
  const live = withStatus("published");
  const inReview = withStatus("pending_review");
  const needsChanges = withStatus("rejected");
  const paused = live.filter((e) => e.salesPaused).length;

  const steps: Step[] = [
    {
      done: true,
      title: "Web3 switched on",
      body: "Your NS CAPTURES account can collect and create editions.",
    },
    {
      done: hasWallet,
      title: "Web3 vault wallet",
      body: "Create or connect a wallet in your vault. Sales and royalties settle there.",
      action: hasWallet
        ? undefined
        : { label: "Open vault", to: "/account?tab=web3", external: true },
    },
    {
      done: depositMet,
      title: "Minting fee deposit",
      body: `Hold at least ${depositConfig.usdtThreshold} USDT, ${depositConfig.usdcThreshold} USDC, ${depositConfig.ethThreshold} ETH, ${depositConfig.solThreshold} SOL or ${depositConfig.btcThreshold} BTC in your vault to cover archival certification and minting.`,
      action: depositMet
        ? undefined
        : { label: "Deposit", to: "/account?tab=web3", external: true },
    },
    {
      done: Boolean(profile),
      title: "Creator profile",
      body: "The name and avatar collectors see: your profile picture, or an avatar or character you upload.",
      action: { label: profile ? "Edit" : "Set up", onClick: () => onNavigate("profile") },
    },
    {
      done: editions.length > 0,
      title: "Create an edition",
      body: "Use an approved photo, uploaded artwork or your profile picture. Add it to a collection or list it on its own.",
      action: { label: "Create", onClick: () => onNavigate("create") },
    },
    {
      done: editions.some((e) => editionReviewStatus(e) !== "draft"),
      title: "Submit it for review",
      body: "Our curators check the file, rights and pricing, then approve it or tell you what to change.",
    },
    {
      done: live.length > 0,
      title: "Live on the marketplace",
      body: "Approved editions appear for collectors to buy. You can pause sales at any time.",
      action: live.length > 0 ? { label: "View marketplace", to: "/editions" } : undefined,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Live editions"
          value={String(live.length)}
          hint={paused > 0 ? `${paused} with sales paused` : undefined}
        />
        <StatTile
          label="In review"
          value={String(inReview.length)}
          hint={needsChanges.length > 0 ? `${needsChanges.length} need changes` : undefined}
        />
        <StatTile
          label="Copies sold"
          value={String(sales.salesCount)}
          hint={sales.salesCount > 0 ? `${formatGbpWhole(sales.grossGbp)} in sales` : undefined}
        />
        <StatTile
          label="Royalties"
          value={formatGbpWhole(sales.royaltiesGbp)}
          hint={
            sales.collectors > 0
              ? `${sales.collectors} collector${sales.collectors === 1 ? "" : "s"}`
              : undefined
          }
        />
      </div>

      {needsChanges.length > 0 && (
        <section
          aria-labelledby="studio-attention"
          className="rounded-lg border border-(--ed-negative)/40 bg-(--ed-negative)/10 p-4"
        >
          <h2
            id="studio-attention"
            className="flex items-center gap-2 text-base font-medium text-(--ed-text)"
          >
            <AlertCircle aria-hidden className="size-5 text-(--ed-negative)" />
            Changes requested
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {needsChanges.map((edition) => (
              <li
                key={edition.id}
                className={`${surfaceCardClass} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}
              >
                <img
                  src={edition.image}
                  alt=""
                  className="size-12 shrink-0 rounded-md object-cover outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--ed-text)">{edition.title}</p>
                  {edition.reviewNote && (
                    <p className="text-sm text-(--ed-muted)">{edition.reviewNote}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(edition)}
                  className={smallSecondaryButton}
                >
                  <PencilLine aria-hidden className="size-3.5" />
                  Edit and resubmit
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="studio-steps" className={`${surfaceCardClass} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="studio-steps" className="text-lg font-medium text-(--ed-text)">
            How to make an edition public
          </h2>
          <span className={monoLabelClass}>
            {doneCount} of {steps.length} done
          </span>
        </div>
        <ol className="mt-4 flex flex-col gap-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-(--ed-positive)" />
              ) : (
                <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-(--ed-border-strong)" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--ed-text)">
                  <span className="mr-1.5 font-mono text-xs text-(--ed-muted)">{index + 1}.</span>
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                </p>
                <p className="mt-0.5 text-sm leading-6 text-(--ed-muted)">{step.body}</p>
              </div>
              {step.action &&
                (step.action.to ? (
                  <Link
                    to={step.action.to}
                    target={step.action.external ? "_blank" : undefined}
                    rel={step.action.external ? "noreferrer" : undefined}
                    className={actionClass}
                  >
                    {step.action.label}
                    {step.action.external && (
                      <>
                        <ArrowUpRight aria-hidden className="size-3.5" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </>
                    )}
                  </Link>
                ) : (
                  <button type="button" onClick={step.action.onClick} className={actionClass}>
                    {step.action.label}
                  </button>
                ))}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
