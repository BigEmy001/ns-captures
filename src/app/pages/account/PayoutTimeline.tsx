import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fetchPayoutEvents, type PayoutEvent, type PayoutRequest } from "../../data/db";
import {
  PAYOUT_STAGES,
  isTerminal,
  stageIndex,
  stageMeta,
  type PayoutStage,
} from "../../data/payout-stages";
import { formatConverted } from "../../data/conversion";

/**
 * Where a payout has got to. Steps the payout has actually passed through are
 * dated from the event trail; a conditional step that was skipped is marked as
 * such rather than left looking stuck.
 */
export function PayoutTimeline({
  request,
  onSettleCharge,
}: {
  request: PayoutRequest;
  onSettleCharge?: (request: PayoutRequest) => void;
}) {
  const [events, setEvents] = useState<PayoutEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchPayoutEvents(request.id).then((rows) => {
      if (cancelled) return;
      setEvents(rows);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [request.id]);

  const reachedAt = new Map<string, PayoutEvent>();
  for (const event of events) {
    if (!reachedAt.has(event.stage)) reachedAt.set(event.stage, event);
  }

  const converted = request.convertedAmount !== null && request.conversionRate !== null;
  const currency = request.payoutCurrency || "GBP";
  const current = request.stage;
  const currentIndex = stageIndex(current);
  const ended = isTerminal(current);

  if (isLoading) {
    return <p className="text-xs text-[#758078]">Loading timeline…</p>;
  }

  return (
    <div>
      {ended && (
        <div className="mb-4 rounded-xl border border-[#ececec] bg-[#f7f7f5] p-4">
          <p className="text-sm font-semibold text-[#18211f]">{stageMeta(current).label}</p>
          <p className="mt-0.5 text-xs text-[#59645f]">{stageMeta(current).body}</p>
          {request.adminNote && (
            <p className="mt-2 text-xs text-[#59645f]">
              <span className="font-semibold">Reason:</span> {request.adminNote}
            </p>
          )}
        </div>
      )}

      <ol className="relative space-y-0">
        {PAYOUT_STAGES.map((step, i) => {
          const event = reachedAt.get(step.id);
          const reached = Boolean(event);
          const isCurrent = !ended && step.id === current;
          // A conditional step the payout has already moved past was simply
          // not applicable to this transfer.
          const skipped = !reached && !ended && currentIndex > i && step.conditional;
          const pending = !reached && !isCurrent && !skipped;

          return (
            <li key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`mt-1 grid size-3.5 shrink-0 place-items-center rounded-full border-2 ${
                    isCurrent
                      ? "border-[#1e4a3f] bg-white"
                      : reached
                        ? "border-[#1e4a3f] bg-[#1e4a3f]"
                        : "border-[#dcdcd6] bg-white"
                  }`}
                >
                  {isCurrent && <span className="size-1.5 rounded-full bg-[#1e4a3f]" />}
                </span>
                {i < PAYOUT_STAGES.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`w-0.5 flex-1 ${reached ? "bg-[#1e4a3f]" : "bg-[#e8e8e2]"}`}
                  />
                )}
              </div>

              <div className={`pb-5 ${pending || skipped ? "opacity-45" : ""}`}>
                <p
                  className={`text-sm ${isCurrent ? "font-semibold text-[#18211f]" : "text-[#18211f]"}`}
                >
                  {step.label}
                  {skipped && (
                    <span className="ml-2 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                      Not applicable
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-[#59645f]">{step.body}</p>
                {event && (
                  <p className="mt-1 font-mono text-[10px] text-[#8a8f89]">
                    {format(new Date(event.createdAt), "d MMM yyyy, HH:mm")}
                  </p>
                )}

                {step.id === "currency_conversion" && converted && (
                  <>
                    <dl className="mt-2 space-y-1 rounded-lg bg-[#FAF9F5] p-3 text-xs">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#59645f]">Converted at</dt>
                        <dd className="tabular-nums text-[#18211f]">
                          {request.conversionRate?.toLocaleString("en-GB", {
                            maximumFractionDigits: 6,
                          })}{" "}
                          {request.payoutCurrency}/£
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-[#e4e2da] pt-1">
                        <dt className="font-semibold text-[#18211f]">You receive</dt>
                        <dd className="font-semibold tabular-nums text-[#18211f]">
                          {formatConverted(request.convertedAmount || 0, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#59645f]">
                          Conversion charge ({request.conversionFeePercent}%)
                        </dt>
                        <dd className="tabular-nums text-[#59645f]">
                          {formatConverted(request.conversionFeeAmount || 0, currency)}
                        </dd>
                      </div>
                    </dl>

                    {request.conversionFeeStatus === "waived" && (
                      <p className="mt-2 text-xs text-[#59645f]">
                        The conversion charge is covered by NS CAPTURES. There is nothing for you to
                        pay.
                      </p>
                    )}

                    {request.conversionFeeStatus === "paid" && (
                      <p className="mt-2 text-xs text-[#285746]">
                        Conversion charge settled
                        {request.conversionFeePaidAt
                          ? ` on ${format(new Date(request.conversionFeePaidAt), "d MMM yyyy")}`
                          : ""}
                        . Thank you.
                      </p>
                    )}

                    {request.conversionFeeStatus === "outstanding" && (
                      <div className="mt-2 rounded-lg border border-[#e0b04a]/40 bg-[#f6ecd8] p-3">
                        <p className="text-xs font-semibold text-[#7a5a17]">
                          Conversion charge outstanding — £
                          {(request.conversionFeeGbp || 0).toLocaleString("en-GB", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="mt-1 text-xs text-[#7a5a17]">
                          This charge is payable separately and is not taken out of your payout —
                          you still receive the full amount above.
                        </p>
                        {onSettleCharge && (
                          <button
                            onClick={() => onSettleCharge(request)}
                            className="mt-2.5 rounded-full bg-[#1e4a3f] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#123b31]"
                          >
                            Settle charge
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {event?.note && step.id !== "currency_conversion" && (
                  <p className="mt-1 text-xs text-[#59645f]">{event.note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function stageLabel(stage: PayoutStage): string {
  return stageMeta(stage).label;
}
