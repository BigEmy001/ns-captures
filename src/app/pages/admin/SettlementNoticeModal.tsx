import { useState, useEffect } from "react";
import { X, Send, Save, Clock, Mail, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import {
  type PayoutRequest,
  type PayoutSettlementNotice,
  updatePayoutSettlementNotice,
  createPayoutRequest,
} from "../../data/db";
import { sendPayoutSettlementNotificationEmail } from "../../../lib/email";

export interface SettlementNoticeCandidate {
  id: string;
  name: string;
  email?: string;
  slug?: string;
  balance?: number;
  requestId?: string;
  existingNotice?: PayoutSettlementNotice | null;
}

interface SettlementNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: PayoutRequest | null;
  recipientName?: string;
  recipientEmail?: string;
  candidates?: SettlementNoticeCandidate[];
  onSaved?: (updated: PayoutRequest) => void;
}

export function SettlementNoticeModal({
  isOpen,
  onClose,
  request,
  recipientName = "",
  recipientEmail = "",
  candidates = [],
  onSaved,
}: SettlementNoticeModalProps) {
  if (!isOpen) return null;

  function isSungTarget(name?: string, email?: string, slug?: string): boolean {
    const n = (name || "").toLowerCase();
    const e = (email || "").toLowerCase();
    const s = (slug || "").toLowerCase();
    return (
      e === "junghoonsung@gmail.com" ||
      e.includes("junghoon") ||
      n.includes("sung") ||
      n.includes("junghoon") ||
      s.includes("sung")
    );
  }

  function buildDefaultBodyCopy(amount: number): string {
    const formatted = amount.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `We are pleased to confirm that your payout of £${formatted} has been approved for digital-asset settlement.

Following a final regional routing review, it was determined that your region is currently awaiting access to the company's upcoming Web3 settlement platform. The payout will therefore proceed through the alternative digital-asset conversion and withdrawal route.

Under the stated payout policy, the approved payout amount must be delivered in full. Settlement-related costs are therefore recorded separately and are not deducted from the approved payout amount.

The applicable settlement costs are shown above. The regional review is also the reason this additional settlement requirement has appeared at this stage of processing.

Once the settlement process has been completed, the approved £${formatted} payout will proceed through the applicable GBP-to-USDT conversion and digital-asset withdrawal route.`;
  }

  const isTargetSung = isSungTarget(
    recipientName,
    recipientEmail,
    request?.photographerId,
  );

  const existingNotice: Partial<PayoutSettlementNotice> =
    (request?.details as any)?.settlementNotice || {};

  // For Junghoon Sung, prefill with £16,060.00 unless explicitly customized in existingNotice.
  // For other users, use their existingNotice, or their request amount / balance, or 0.
  const defaultApproved =
    existingNotice.approvedPayout ??
    (isTargetSung ? 16060.0 : (request?.amount ?? 0));

  const defaultConvPercent = existingNotice.conversionCostPercent ?? 7.0;
  const defaultConvAmount =
    existingNotice.conversionCostAmount ??
    (isTargetSung && defaultApproved === 16060.0
      ? 1124.2
      : Math.round(defaultApproved * (defaultConvPercent / 100) * 100) / 100);

  const defaultNetPercent = existingNotice.networkTransferPercent ?? 0.1;
  const defaultNetAmount =
    existingNotice.networkTransferAmount ??
    (isTargetSung && defaultApproved === 16060.0
      ? 16.06
      : Math.round(defaultApproved * (defaultNetPercent / 100) * 100) / 100);

  const defaultTotalSettlement =
    existingNotice.totalSettlementCosts ??
    (isTargetSung && defaultApproved === 16060.0
      ? 1140.26
      : Math.round((defaultConvAmount + defaultNetAmount) * 100) / 100);

  const defaultEmail =
    recipientEmail || (isTargetSung ? "junghoonsung@gmail.com" : "");

  const defaultRecipientName =
    recipientName || (isTargetSung ? "Junghoon Sung" : "Contributor");

  const [currRecipientName, setCurrRecipientName] = useState(defaultRecipientName);
  const [emailTo, setEmailTo] = useState(defaultEmail);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");

  const [enabled, setEnabled] = useState(existingNotice.enabled ?? true);
  const [scheduleNotice, setScheduleNotice] = useState(
    existingNotice.scheduledDeliveryNotice ||
      "This message was automatically scheduled for delivery at 7:00 a.m. in the recipient's local time for convenience.",
  );
  const [approvedPayout, setApprovedPayout] = useState(defaultApproved);
  const [convPercent, setConvPercent] = useState(defaultConvPercent);
  const [convAmount, setConvAmount] = useState(defaultConvAmount);
  const [netPercent, setNetPercent] = useState(defaultNetPercent);
  const [netAmount, setNetAmount] = useState(defaultNetAmount);
  const [totalCosts, setTotalCosts] = useState(defaultTotalSettlement);
  const [deliveryAmount, setDeliveryAmount] = useState(
    existingNotice.payoutAmountScheduled ?? defaultApproved,
  );

  const [salutation, setSalutation] = useState(
    existingNotice.salutation ||
      (isTargetSung
        ? "Dear Mr. Sung,"
        : `Dear ${defaultRecipientName},`),
  );
  const [bodyText, setBodyText] = useState(
    existingNotice.bodyText || buildDefaultBodyCopy(defaultApproved),
  );
  const [signoff, setSignoff] = useState(
    existingNotice.departmentSignoff ||
      "Kind regards,\nFinance & Settlement Department\nNS CAPTURES",
  );

  const [syncFees, setSyncFees] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Recalculate amounts when percentages or base amount changes
  const handleRecalculate = (
    newApproved = approvedPayout,
    newConvPct = convPercent,
    newNetPct = netPercent,
  ) => {
    const cAmt = Math.round(newApproved * (newConvPct / 100) * 100) / 100;
    const nAmt = Math.round(newApproved * (newNetPct / 100) * 100) / 100;
    const tot = Math.round((cAmt + nAmt) * 100) / 100;
    setConvAmount(cAmt);
    setNetAmount(nAmt);
    setTotalCosts(tot);
    setDeliveryAmount(newApproved);
  };

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    const cand = candidates.find((c) => c.id === candidateId || c.slug === candidateId);
    if (!cand) return;

    setCurrRecipientName(cand.name);
    const candIsSung = isSungTarget(cand.name, cand.email, cand.slug);
    const targetEmail = candIsSung
      ? "junghoonsung@gmail.com"
      : (cand.email || "");
    setEmailTo(targetEmail);

    if (cand.existingNotice) {
      // User has their OWN unique saved settlement notice! Load it!
      const n = cand.existingNotice;
      setEnabled(n.enabled ?? true);
      setScheduleNotice(
        n.scheduledDeliveryNotice ||
          "This message was automatically scheduled for delivery at 7:00 a.m. in the recipient's local time for convenience.",
      );
      setApprovedPayout(n.approvedPayout);
      setConvPercent(n.conversionCostPercent);
      setConvAmount(n.conversionCostAmount);
      setNetPercent(n.networkTransferPercent);
      setNetAmount(n.networkTransferAmount);
      setTotalCosts(n.totalSettlementCosts);
      setDeliveryAmount(n.payoutAmountScheduled);
      setSalutation(
        n.salutation ||
          (candIsSung ? "Dear Mr. Sung," : `Dear ${cand.name},`),
      );
      setBodyText(n.bodyText || buildDefaultBodyCopy(n.approvedPayout));
      setSignoff(
        n.departmentSignoff ||
          "Kind regards,\nFinance & Settlement Department\nNS CAPTURES",
      );
    } else if (candIsSung) {
      // Prefilled defaults for Junghoon Sung
      const sungApproved = 16060.0;
      setApprovedPayout(sungApproved);
      setConvPercent(7.0);
      setConvAmount(1124.2);
      setNetPercent(0.1);
      setNetAmount(16.06);
      setTotalCosts(1140.26);
      setDeliveryAmount(sungApproved);
      setSalutation("Dear Mr. Sung,");
      setBodyText(buildDefaultBodyCopy(sungApproved));
    } else {
      // Unique fresh defaults for this contributor
      const userApproved = cand.balance && cand.balance > 0 ? cand.balance : 0;
      const cAmt = Math.round(userApproved * 0.07 * 100) / 100;
      const nAmt = Math.round(userApproved * 0.001 * 100) / 100;
      const tot = Math.round((cAmt + nAmt) * 100) / 100;
      setApprovedPayout(userApproved);
      setConvPercent(7.0);
      setConvAmount(cAmt);
      setNetPercent(0.1);
      setNetAmount(nAmt);
      setTotalCosts(tot);
      setDeliveryAmount(userApproved);
      setSalutation(`Dear ${cand.name},`);
      setBodyText(buildDefaultBodyCopy(userApproved));
    }
  };

  const currentNoticeData: PayoutSettlementNotice = {
    enabled,
    scheduledDeliveryNotice: scheduleNotice.trim(),
    approvedPayout: Number(approvedPayout),
    conversionCostPercent: Number(convPercent),
    conversionCostAmount: Number(convAmount),
    networkTransferPercent: Number(netPercent),
    networkTransferAmount: Number(netAmount),
    totalSettlementCosts: Number(totalCosts),
    payoutAmountScheduled: Number(deliveryAmount),
    salutation: salutation.trim(),
    bodyText: bodyText.trim(),
    departmentSignoff: signoff.trim(),
    updatedAt: new Date().toISOString(),
  };

  const handleSaveToDashboard = async (): Promise<PayoutRequest | null> => {
    setIsSaving(true);
    try {
      let targetRequestId = request?.id;
      let activeDetails = request?.details || {};

      // If no persistent request exists, create one for this creator
      if (!targetRequestId || targetRequestId.startsWith("direct-")) {
        const slug =
          request?.photographerId ||
          candidates.find((c) => c.id === selectedCandidateId)?.slug ||
          candidates.find((c) => c.id === selectedCandidateId)?.id ||
          currRecipientName.toLowerCase().replace(/\s+/g, "-");

        const created = await createPayoutRequest(
          slug,
          Number(approvedPayout),
          "crypto",
          { settlementNotice: currentNoticeData },
        );
        if (created) {
          targetRequestId = created.id;
          activeDetails = created.details;
        } else {
          // Fallback if creating fails
          targetRequestId = targetRequestId || "direct-" + Date.now();
        }
      }

      if (targetRequestId && !targetRequestId.startsWith("direct-")) {
        const ok = await updatePayoutSettlementNotice(
          targetRequestId,
          currentNoticeData,
          activeDetails,
          syncFees,
        );
        if (!ok) throw new Error("Could not update settlement notice in database");
      }

      const updatedRequest: PayoutRequest = {
        ...(request || {
          id: targetRequestId,
          photographerId: currRecipientName.toLowerCase().replace(/\s+/g, "-"),
          amount: Number(approvedPayout),
          method: "crypto" as const,
          details: {},
          status: "APPROVED" as const,
          stage: "currency_conversion" as const,
          adminNote: "",
          requestedAt: new Date().toISOString(),
          processedAt: null,
          payoutCurrency: "USDT",
          conversionRate: null,
          conversionFeePercent: null,
          conversionFeeAmount: null,
          conversionFeeBearer: null,
          conversionFeeGbp: null,
          conversionFeeStatus: null,
          conversionFeePaidAt: null,
          convertedAmount: null,
          transactionReference: null,
          debitedAt: null,
        }),
        id: targetRequestId,
        amount: Number(approvedPayout),
        details: {
          ...activeDetails,
          settlementNotice: currentNoticeData,
        },
        ...(syncFees && enabled
          ? {
              conversionFeePercent: currentNoticeData.conversionCostPercent,
              conversionFeeAmount: currentNoticeData.conversionCostAmount,
              conversionFeeGbp: currentNoticeData.totalSettlementCosts,
              conversionFeeBearer: "contributor",
              conversionFeeStatus: "outstanding",
            }
          : {}),
      };

      onSaved?.(updatedRequest);
      toast.success("Settlement breakdown saved to contributor dashboard");
      return updatedRequest;
    } catch (err: any) {
      toast.error(err.message || "Failed to save notice");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error("Please enter a recipient email address");
      return;
    }

    setIsSending(true);
    try {
      await sendPayoutSettlementNotificationEmail({
        to: emailTo.trim(),
        recipientName: currRecipientName || "Contributor",
        approvedPayout: currentNoticeData.approvedPayout,
        conversionCostPercent: currentNoticeData.conversionCostPercent,
        conversionCostAmount: currentNoticeData.conversionCostAmount,
        networkTransferPercent: currentNoticeData.networkTransferPercent,
        networkTransferAmount: currentNoticeData.networkTransferAmount,
        totalSettlementCosts: currentNoticeData.totalSettlementCosts,
        payoutAmountScheduled: currentNoticeData.payoutAmountScheduled,
        scheduledDeliveryNotice: currentNoticeData.scheduledDeliveryNotice,
        salutation: currentNoticeData.salutation,
        bodyText: currentNoticeData.bodyText,
        departmentSignoff: currentNoticeData.departmentSignoff,
      });

      toast.success(`Settlement breakdown email sent to ${emailTo.trim()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send email notification");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveAndSendBoth = async () => {
    const updated = await handleSaveToDashboard();
    if (updated || emailTo.trim()) {
      await handleSendEmail();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-notice-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#dce8df] bg-[#FAF9F5] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e2ece5] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#1e4a3f] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                [ AUTOMATED NOTIFICATION ]
              </span>
              <h2
                id="settlement-notice-title"
                className="font-serif text-lg font-medium text-[#18211f]"
              >
                Payout Settlement Breakdown Notice
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#59645f]">
              Recipient: <span className="font-semibold text-[#18211f]">{currRecipientName}</span> (
              {emailTo || "No email"}) · Amount:{" "}
              <span className="font-mono font-semibold text-[#1e4a3f]">
                £{approvedPayout.toLocaleString()}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#59645f] hover:bg-[#e8eee9] hover:text-[#18211f] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Candidate Selector (if provided) */}
        {candidates.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#ececec] bg-white p-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#18211f]">
              <User className="size-3.5 text-[#1e4a3f]" />
              <span>Select Recipient (User / Contributor)</span>
            </label>
            <select
              value={selectedCandidateId}
              onChange={(e) => handleSelectCandidate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#ececec] bg-[#FAF9F5] px-3 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
            >
              <option value="">-- Choose a user or enter custom details below --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email || "No email"}) {c.balance ? `· Balance: £${c.balance}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab switch */}
        <div className="mt-4 flex gap-2 border-b border-[#e2ece5] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
              activeTab === "edit"
                ? "bg-[#1e4a3f] text-white"
                : "bg-white text-[#59645f] hover:text-[#18211f]"
            }`}
          >
            Edit Notice &amp; Rates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
              activeTab === "preview"
                ? "bg-[#1e4a3f] text-white"
                : "bg-white text-[#59645f] hover:text-[#18211f]"
            }`}
          >
            Live Contributor Preview
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 max-h-[55vh] overflow-y-auto space-y-4 pr-1">
          {activeTab === "edit" ? (
            <>
              {/* Delivery Schedule Notice */}
              <div>
                <label className="block text-xs font-semibold text-[#18211f]">
                  Scheduled Delivery Banner Text
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="size-4 text-[#1e4a3f] shrink-0" />
                  <input
                    type="text"
                    value={scheduleNotice}
                    onChange={(e) => setScheduleNotice(e.target.value)}
                    placeholder="This message was automatically scheduled for delivery at 7:00 a.m. in the recipient's local time for convenience."
                    className="w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
                  />
                </div>
              </div>

              {/* Financial Calculation Grid */}
              <div className="rounded-xl border border-[#dce8df] bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1e4a3f]">
                    Settlement Calculation Engine
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRecalculate(approvedPayout, 7.0, 0.1)}
                    className="flex items-center gap-1 text-[11px] text-[#1e4a3f] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="size-3" />
                    Reset to Defaults (7% + 0.1%)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#59645f]">
                      Approved Payout (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={approvedPayout}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setApprovedPayout(val);
                        handleRecalculate(val, convPercent, netPercent);
                      }}
                      className="mt-1 w-full rounded-md border border-[#ececec] px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#1e4a3f]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#59645f]">
                      Digital Asset Conversion Fee (%)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={convPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setConvPercent(val);
                          handleRecalculate(approvedPayout, val, netPercent);
                        }}
                        className="w-20 rounded-md border border-[#ececec] px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#1e4a3f]"
                      />
                      <span className="text-xs text-[#59645f]">= £{convAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#59645f]">
                      USDT Network/Transfer Cost (%)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={netPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setNetPercent(val);
                          handleRecalculate(approvedPayout, convPercent, val);
                        }}
                        className="w-20 rounded-md border border-[#ececec] px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#1e4a3f]"
                      />
                      <span className="text-xs text-[#59645f]">= £{netAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#fbf5eb] border border-[#e8ded0] p-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7a5a17]">
                      Total Settlement Costs
                    </span>
                    <span className="font-mono text-base font-bold text-[#7a5a17]">
                      £{totalCosts.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#f0f0f0]">
                  <input
                    type="checkbox"
                    id="sync-payout-fees"
                    checked={syncFees}
                    onChange={(e) => setSyncFees(e.target.checked)}
                    className="size-4 accent-[#1e4a3f] cursor-pointer"
                  />
                  <label htmlFor="sync-payout-fees" className="text-xs text-[#18211f] cursor-pointer">
                    Sync conversion charge to payout request (£{totalCosts.toFixed(2)} payable by contributor)
                  </label>
                </div>
              </div>

              {/* Recipient Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#18211f]">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    value={currRecipientName}
                    onChange={(e) => {
                      setCurrRecipientName(e.target.value);
                      setSalutation(
                        e.target.value.toLowerCase().includes("sung")
                          ? "Dear Mr. Sung,"
                          : `Dear ${e.target.value || "Contributor"},`,
                      );
                    }}
                    placeholder="Junghoon Sung"
                    className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#18211f]">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="junghoonsung@gmail.com"
                    className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
                  />
                </div>
              </div>

              {/* Salutation */}
              <div>
                <label className="block text-xs font-semibold text-[#18211f]">
                  Salutation
                </label>
                <input
                  type="text"
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  placeholder="Dear Mr. Sung,"
                  className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
                />
              </div>

              {/* Body Text */}
              <div>
                <label className="block text-xs font-semibold text-[#18211f]">
                  Notification Body Copy
                </label>
                <textarea
                  rows={6}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-xs leading-relaxed text-[#18211f] outline-none focus:border-[#1e4a3f]"
                />
              </div>

              {/* Signoff */}
              <div>
                <label className="block text-xs font-semibold text-[#18211f]">
                  Department Sign-off
                </label>
                <textarea
                  rows={2}
                  value={signoff}
                  onChange={(e) => setSignoff(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
                />
              </div>

              {/* Display switch */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notice-enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="size-4 accent-[#1e4a3f] cursor-pointer"
                />
                <label htmlFor="notice-enabled" className="text-xs font-medium text-[#18211f] cursor-pointer">
                  Display this breakdown actively on the Contributor's Account dashboard
                </label>
              </div>
            </>
          ) : (
            /* Live Preview */
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-[#1a382b] bg-[#090f0c] text-white shadow-2xl text-xs sm:text-sm">
                {/* Top Protocol Clearance Ribbon */}
                <div className="flex items-center justify-between border-b-2 border-[#00e599] bg-[#064e3b] px-4 py-2.5">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-[#00e599] uppercase">
                    ● CLEARANCE PROTOCOL // LEVEL-4 DISPATCH
                  </span>
                  <span className="rounded border border-[#00e599] bg-[#00e599]/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-[#a7f3d0]">
                    REF: #NSC-8842-SETTLE
                  </span>
                </div>

                {/* Automated Dispatch Callout */}
                <div className="mx-4 mt-4 rounded-lg border border-[#163626] bg-[#0b1812] p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-[#00e599] text-sm leading-none">⚡</span>
                    <div>
                      <span className="font-mono text-[10px] font-bold tracking-wider text-[#00e599] uppercase block">
                        AUTOMATED SYSTEM NOTIFICATION
                      </span>
                      <p className="mt-0.5 text-xs italic text-[#94a3b8]">"{scheduleNotice}"</p>
                    </div>
                  </div>
                </div>

                {/* Hero Section */}
                <div className="border-b border-[#142a20] px-4 py-5 text-center">
                  <div className="inline-block rounded-full border border-[#00e599] bg-[#00e599]/10 px-3 py-0.5 text-[10px] font-mono font-bold tracking-wide text-[#00e599] uppercase mb-2">
                    ● APPROVED FOR DIGITAL-ASSET SETTLEMENT
                  </div>
                  <div className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
                    Approved Payout Capital
                  </div>
                  <div className="mt-1 font-mono text-3xl font-extrabold text-white tracking-tight">
                    £{approvedPayout.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[#64748b]">
                    CURRENCY: GBP (STERLING) • ROUTE: USDT (TRC-20 / ERC-20)
                  </div>
                </div>

                {/* Screening Badges */}
                <div className="grid grid-cols-3 gap-2 px-4 pt-3">
                  <div className="rounded-lg border border-[#153223] bg-[#0c1612] p-2 text-center">
                    <div className="font-mono text-[9px] font-bold text-[#00e599]">AML AUDIT</div>
                    <div className="mt-0.5 text-[11px] font-bold text-[#f8fafc]">CLEARED ✓</div>
                  </div>
                  <div className="rounded-lg border border-[#153223] bg-[#0c1612] p-2 text-center">
                    <div className="font-mono text-[9px] font-bold text-[#00e599]">PRINCIPAL</div>
                    <div className="mt-0.5 text-[11px] font-bold text-[#f8fafc]">100% INTACT</div>
                  </div>
                  <div className="rounded-lg border border-[#b45309] bg-[#1c1304] p-2 text-center">
                    <div className="font-mono text-[9px] font-bold text-[#fbbf24]">SETTLEMENT</div>
                    <div className="mt-0.5 text-[11px] font-bold text-[#fbbf24]">PENDING</div>
                  </div>
                </div>

                {/* Ledger Breakdown */}
                <div className="m-4 overflow-hidden rounded-lg border border-[#173727] bg-[#070d0a]">
                  <div className="border-b border-[#173727] bg-[#0b1e16] px-3.5 py-2">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-[#00e599] uppercase">
                      PAYOUT SETTLEMENT BREAKDOWN
                    </span>
                  </div>

                  <div className="divide-y divide-[#11251c] text-xs">
                    <div className="flex items-center justify-between bg-[#08120d] px-3.5 py-2.5">
                      <div>
                        <div className="font-medium text-[#f8fafc]">• Approved Payout</div>
                        <div className="text-[10px] text-[#64748b]">Full creator allocation</div>
                      </div>
                      <span className="font-mono font-bold text-white">
                        £{approvedPayout.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-[#060b08] px-3.5 py-2.5">
                      <div>
                        <div className="font-medium text-[#e2e8f0]">
                          • Digital Asset Conversion &amp; Withdrawal ({convPercent}%)
                        </div>
                        <div className="text-[10px] text-[#64748b]">GBP to USDT liquidity provisioning</div>
                      </div>
                      <span className="font-mono text-[#cbd5e1]">£{convAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#08120d] px-3.5 py-2.5">
                      <div>
                        <div className="font-medium text-[#e2e8f0]">
                          • USDT Network/Transfer Cost ({netPercent}%)
                        </div>
                        <div className="text-[10px] text-[#64748b]">Validator &amp; smart-contract gas execution</div>
                      </div>
                      <span className="font-mono text-[#cbd5e1]">£{netAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-b border-[#d97706] bg-[#261704] px-3.5 py-3">
                      <div>
                        <div className="font-bold tracking-wide text-[#fbbf24] uppercase">
                          ⚡ Total Settlement Costs
                        </div>
                        <div className="text-[10px] text-[#f59e0b]">Recorded separately • Not deducted</div>
                      </div>
                      <span className="rounded bg-[#d97706] px-2.5 py-1 font-mono font-extrabold text-white text-sm">
                        £{totalCosts.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#00e599] bg-[#062b1d] px-3.5 py-3">
                      <div>
                        <div className="font-extrabold tracking-wide text-[#00e599] uppercase">
                          ✓ Payout Amount Scheduled for Delivery
                        </div>
                        <div className="text-[10px] text-[#6ee7b7]">Delivered intact upon clearance</div>
                      </div>
                      <span className="font-mono text-base font-extrabold text-[#00e599]">
                        £{deliveryAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Letter Body */}
                <div className="mx-4 mb-4 rounded-lg border border-[#163627] border-l-4 border-l-[#00e599] bg-[#08130f] p-4 text-xs leading-relaxed text-[#cbd5e1]">
                  <p className="font-bold text-white text-sm">{salutation}</p>
                  <div className="mt-2 space-y-2">
                    {bodyText.split("\n\n").map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-[#142a1f] pt-2.5 text-[11px] text-[#94a3b8] whitespace-pre-line font-medium">
                    {signoff}
                  </div>
                </div>

                {/* CTA Mock */}
                <div className="px-4 pb-4 text-center">
                  <span className="inline-block rounded-lg bg-[#00e599] px-6 py-2.5 font-bold text-[#021c12] text-xs uppercase tracking-wider shadow-lg shadow-[#00e599]/30">
                    Settle Clearance &amp; Release Payout →
                  </span>
                  <div className="mt-2 font-mono text-[9px] text-[#64748b]">
                    256-BIT ENCRYPTED AUDIT CHANNEL • INSTANT CLEARANCE ROUTING
                  </div>
                </div>

                {/* Cryptographic Hash Bar */}
                <div className="flex items-center justify-between border-t border-[#132b1f] bg-[#050907] px-4 py-2 font-mono text-[9px] text-[#475569]">
                  <span>SHA256:8842-SETTLE-OK</span>
                  <span className="font-bold text-[#00e599]">● AUTHENTICATED DISPATCH</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2ece5] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#ececec] bg-white px-4 py-2 text-xs font-semibold text-[#59645f] hover:bg-[#f2f4f2] transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveToDashboard}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1e4a3f] bg-white px-4 py-2 text-xs font-semibold text-[#1e4a3f] hover:bg-[#f0f5f2] transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>{isSaving ? "Saving..." : "Save to Dashboard"}</span>
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={handleSendEmail}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1e4a3f] bg-white px-4 py-2 text-xs font-semibold text-[#1e4a3f] hover:bg-[#f0f5f2] transition disabled:opacity-50 cursor-pointer"
            >
              <Mail className="size-3.5" />
              <span>{isSending ? "Sending..." : "Send Email"}</span>
            </button>

            <button
              type="button"
              disabled={isSaving || isSending}
              onClick={handleSaveAndSendBoth}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1e4a3f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#123b31] transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Send className="size-3.5" />
              <span>{isSaving || isSending ? "Processing..." : "Save & Send Email"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
