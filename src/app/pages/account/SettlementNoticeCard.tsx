import { Clock, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import type { PayoutRequest, PayoutSettlementNotice } from "../../data/db";

interface SettlementNoticeCardProps {
  notice: PayoutSettlementNotice;
  request: PayoutRequest;
  onSettleCharge?: (request: PayoutRequest) => void;
}

export function SettlementNoticeCard({
  notice,
  request,
  onSettleCharge,
}: SettlementNoticeCardProps) {
  if (!notice || notice.enabled === false) return null;

  const isOutstanding = request.conversionFeeStatus === "outstanding";
  const isPaid = request.conversionFeeStatus === "paid";

  const scheduleText =
    notice.scheduledDeliveryNotice ||
    "This message was automatically scheduled for delivery at 7:00 a.m. in the recipient's local time for convenience.";

  const paragraphs = (
    notice.bodyText ||
    `We are pleased to confirm that your payout of £${notice.approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been approved for digital-asset settlement.

Following a final regional routing review, it was determined that your region is currently awaiting access to the company's upcoming Web3 settlement platform. The payout will therefore proceed through the alternative digital-asset conversion and withdrawal route.

Under the stated payout policy, the approved payout amount must be delivered in full. Settlement-related costs are therefore recorded separately and are not deducted from the approved payout amount.

The applicable settlement costs are shown above. The regional review is also the reason this additional settlement requirement has appeared at this stage of processing.

Once the settlement process has been completed, the approved £${notice.approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} payout will proceed through the applicable GBP-to-USDT conversion and digital-asset withdrawal route.`
  )
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      aria-label="Automated Payout Settlement Notification"
      className="overflow-hidden rounded-2xl border border-[#cce0d4] bg-gradient-to-b from-[#f9fbf9] to-white p-5 sm:p-6 shadow-sm"
    >
      {/* Top Banner Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2ece5] pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-[#1e4a3f] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
            [ AUTOMATED SYSTEM NOTIFICATION ]
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#59645f]">
          <Clock className="size-3.5 text-[#1e4a3f]" />
          <span className="italic">{scheduleText}</span>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="mt-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#18211f]">
          PAYOUT SETTLEMENT BREAKDOWN
        </h3>

        <div className="mt-3 overflow-hidden rounded-xl border border-[#ececec] bg-white text-xs sm:text-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0f0f0]">
            <span className="text-[#59645f]">• Approved Payout:</span>
            <span className="font-mono font-semibold text-[#18211f]">
              £{notice.approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0f0f0] bg-[#fafafa]">
            <span className="text-[#59645f]">
              • Digital Asset Conversion &amp; Withdrawal Cost ({notice.conversionCostPercent}%):
            </span>
            <span className="font-mono text-[#18211f]">
              £{notice.conversionCostAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0f0f0]">
            <span className="text-[#59645f]">
              • USDT Network/Transfer Cost ({notice.networkTransferPercent}%):
            </span>
            <span className="font-mono text-[#18211f]">
              £{notice.networkTransferAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e8ded0] bg-[#fbf5eb]">
            <span className="font-semibold text-[#7a5a17]">• Total Settlement Costs:</span>
            <span className="font-mono font-bold text-[#7a5a17]">
              £{notice.totalSettlementCosts.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-[#f0f7f3]">
            <span className="font-bold text-[#1e4a3f]">
              • Payout Amount Scheduled for Delivery:
            </span>
            <span className="font-mono text-base font-bold text-[#1e4a3f]">
              £{notice.payoutAmountScheduled.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Official Communication Body */}
      <div className="mt-5 border-t border-[#e2ece5] pt-5 text-xs sm:text-sm text-[#333d37] space-y-3">
        <p className="font-semibold text-[#18211f]">
          {notice.salutation || "Dear Contributor,"}
        </p>

        {paragraphs.map((p, idx) => (
          <p key={idx} className="leading-relaxed">
            {p}
          </p>
        ))}

        <div className="pt-2 text-xs text-[#59645f] whitespace-pre-line font-medium">
          {notice.departmentSignoff || "Kind regards,\nFinance & Settlement Department\nNS CAPTURES"}
        </div>
      </div>

      {/* Action Footer */}
      {isOutstanding && onSettleCharge && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e0b04a]/40 bg-[#fbf4e8] p-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#a0680d]" />
            <div>
              <p className="text-xs font-semibold text-[#7a5a17]">
                Settlement Charge Outstanding: £
                {notice.totalSettlementCosts.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-[11px] text-[#8c6722]">
                Per platform policy, settlement fees are not deducted from your £
                {notice.approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} payout. Settle via deposit wallet to release transfer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSettleCharge(request)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1e4a3f] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#123b31] cursor-pointer"
          >
            <span>Settle Charge</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {isPaid && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50/80 p-3.5 text-xs text-green-800">
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
          <span>
            Settlement charge settled in full. Approved payout of £
            {notice.payoutAmountScheduled.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is scheduled for digital release.
          </span>
        </div>
      )}
    </section>
  );
}

