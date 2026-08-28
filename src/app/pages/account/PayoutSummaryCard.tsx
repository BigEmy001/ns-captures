import { format, parseISO } from "date-fns";
import { stageMetaFor, canReinitiate, type PayoutStage } from "../../data/payout-stages";
import type { PayoutRequest } from "../../data/db";
import { formatConverted } from "../../data/conversion";

/**
 * The headline card above a payout's timeline: where it stands, how much, by
 * what route, and when it should land.
 *
 * Every figure comes off the payout row. Nothing here is free text an admin
 * typed for display — the amount is the amount that will move, and a returned
 * payout says so rather than being quietly dressed up as still in flight.
 */

const TONE: Record<string, { chip: string; dot: string }> = {
  live: { chip: "bg-[#dce8df] text-[#1e4a3f]", dot: "bg-[#1e4a3f]" },
  done: { chip: "bg-[#dce8df] text-[#1e4a3f]", dot: "bg-[#1e4a3f]" },
  halted: { chip: "bg-[#fdeaea] text-[#9b2c2c]", dot: "bg-[#9b2c2c]" },
  waiting: { chip: "bg-[#fdf3e2] text-[#8a5a12]", dot: "bg-[#8a5a12]" },
};

function toneFor(stage: PayoutStage): keyof typeof TONE {
  if (stage === "completed" || stage === "delivered") return "done";
  if (stage === "returned" || stage === "rejected" || stage === "cancelled") return "halted";
  if (stage === "requested" || stage === "under_review") return "waiting";
  return "live";
}

/** "RE-INITIATED — PROCESSING" reads better than either half on its own. */
function headlineStatus(request: PayoutRequest): string {
  const label = stageMetaFor(request.method, request.stage).label.toUpperCase();
  if (request.stage === "re_initiated") return "RE-INITIATED — PROCESSING";
  return label;
}

function Row({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">{label}</dt>
      <dd className="mt-1 text-sm text-[#18211f] break-words">{children}</dd>
    </div>
  );
}

const METHOD_LABEL: Record<string, string> = {
  local_bank: "Registered Bank Account",
  card: "Registered Card",
  crypto: "Crypto Wallet",
  paypal: "PayPal Account",
};

function fmtDate(value: string | null | undefined, withDay = false) {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : value;
    return format(d, withDay ? "EEEE, d MMMM yyyy" : "d MMMM yyyy");
  } catch {
    return "—";
  }
}

export function PayoutSummaryCard({
  request,
  previous,
}: {
  request: PayoutRequest;
  /** The returned payout this one replaces, when there is one. */
  previous?: PayoutRequest;
}) {
  const tone = TONE[toneFor(request.stage)];
  const isReplacement = Boolean(request.reinitiatedFrom);
  const converted =
    request.convertedAmount !== null &&
    request.convertedAmount !== undefined &&
    request.payoutCurrency;

  const transactionType = isReplacement
    ? `${request.method === "local_bank" ? "Bank" : "Payout"} Transfer — Re-Initiated`
    : METHOD_LABEL[request.method] || "Payout";

  return (
    <section
      className="rounded-2xl border border-[#ececec] bg-white p-4 sm:p-6"
      aria-label="Payout status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">
            Payout Status
          </p>
          <p className="mt-1 flex items-center gap-2 font-serif text-lg sm:text-xl text-[#18211f]">
            <span className={`inline-block size-2 shrink-0 rounded-full ${tone.dot}`} />
            <span className="break-words">{headlineStatus(request)}</span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${tone.chip}`}
        >
          {request.status}
        </span>
      </div>

      <div className="mt-4 sm:mt-5 rounded-xl bg-[#f8f9f7] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">
          Payout Amount
        </p>
        <p className="mt-0.5 font-serif text-2xl sm:text-3xl text-[#18211f]">
          £{Number(request.amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}{" "}
          <span className="text-base text-[#6b716d]">GBP</span>
        </p>
        {converted && (
          <p className="mt-1 text-xs text-[#59645f]">
            Arriving as{" "}
            {formatConverted(request.convertedAmount as number, request.payoutCurrency as string)}
          </p>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Row label="Payout Method">{METHOD_LABEL[request.method] || request.method}</Row>
        <Row label="Transaction Type">{transactionType}</Row>

        <Row label="Reference">
          <span className="font-mono text-xs break-all">
            {request.transactionReference || `NSC-PYT-${request.id.slice(0, 8).toUpperCase()}`}
          </span>
        </Row>
        <Row label="Current Status">{stageMetaFor(request.method, request.stage).label}</Row>

        {previous && (
          <Row label="Previous Status">
            {stageMetaFor(previous.method, previous.stage).label}
            {previous.returnedReason ? ` — ${previous.returnedReason}` : ""}
          </Row>
        )}

        <Row label="Initiated">{fmtDate(request.requestedAt)}</Row>

        {request.estimatedArrival && (
          <Row label="Estimated Arrival">{fmtDate(request.estimatedArrival, true)}</Row>
        )}

        <Row label="Last Updated">{fmtDate(request.processedAt || request.requestedAt)}</Row>

        {request.initiatedBy && (
          <Row label="Raised By" wide>
            <span className="text-[#59645f]">
              NS CAPTURES raised this withdrawal on your behalf.
            </span>
          </Row>
        )}
      </dl>

      {canReinitiate(request.stage) && (
        <p className="mt-5 rounded-xl border border-[#f0d8d8] bg-[#fdf6f6] px-4 py-3 text-xs text-[#9b2c2c]">
          This transfer was sent back before it reached your account
          {request.returnedReason ? `: ${request.returnedReason}` : "."} No money has left your
          balance. NS CAPTURES will raise a replacement transfer.
        </p>
      )}
    </section>
  );
}
