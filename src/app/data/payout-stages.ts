/**
 * The ten stages a payout moves through, plus the two ways it can end early.
 * Shared by the contributor's timeline and the admin control so the two can
 * never describe the same payout differently.
 */
export interface PayoutStageMeta {
  id: string;
  label: string;
  body: string;
  adminBody: string;
  /** Steps that only apply to some transfers, e.g. a currency conversion. */
  conditional?: boolean;
}

export const PAYOUT_STAGES: readonly PayoutStageMeta[] = [
  {
    id: "requested",
    label: "Payout Requested",
    body: "You submitted the withdrawal request.",
    adminBody: "Contributor submitted the withdrawal request.",
  },
  {
    id: "under_review",
    label: "Under Review",
    body: "NS CAPTURES is verifying your payout details.",
    adminBody: "Verifying the payout details.",
  },
  {
    id: "approved",
    label: "Payout Approved",
    body: "Your request has been approved.",
    adminBody: "Request approved. This is where the balance is debited.",
  },
  {
    id: "processing",
    label: "Payment Processing",
    body: "The payment instruction has been created and processing has begun.",
    adminBody: "Payment instruction created.",
  },
  {
    id: "currency_conversion",
    label: "Currency Conversion",
    body: "Funds are being converted to your payout currency.",
    adminBody: "Only if the payout currency differs from the sending currency.",
    conditional: true,
  },
  {
    id: "network_processing",
    label: "Bank / Payment Network Processing",
    body: "The payment has been submitted through the banking or payment network.",
    adminBody: "Submitted to the banking or payment network.",
  },
  {
    id: "intermediary_processing",
    label: "Intermediary Bank Processing",
    body: "The transfer is passing through a correspondent bank.",
    adminBody: "Only for international transfers routed via correspondent banks.",
    conditional: true,
  },
  {
    id: "recipient_bank_processing",
    label: "Recipient Bank Processing",
    body: "Your bank has accepted the incoming payment for processing.",
    adminBody: "Recipient bank has accepted the payment.",
  },
  {
    id: "delivered",
    label: "Payment Delivered",
    body: "The funds have been delivered to your account.",
    adminBody: "Funds delivered or credited.",
  },
  {
    id: "completed",
    label: "Completed",
    body: "This payout is complete and the transaction is closed.",
    adminBody: "Closes the payout and settles it against the earnings ledger.",
  },
] as const;

export const TERMINAL_STAGES: readonly PayoutStageMeta[] = [
  {
    id: "rejected",
    label: "Payout Rejected",
    body: "This request was not approved.",
    adminBody: "Ends the payout. The balance is not debited.",
  },
  {
    id: "cancelled",
    label: "Payout Cancelled",
    body: "This request was cancelled.",
    adminBody: "Ends the payout without completing it.",
  },
] as const;

export type PayoutStage =
  (typeof PAYOUT_STAGES)[number]["id"] | (typeof TERMINAL_STAGES)[number]["id"];

const ALL = [...PAYOUT_STAGES, ...TERMINAL_STAGES];

export function stageMeta(stage: PayoutStage) {
  return ALL.find((s) => s.id === stage) || PAYOUT_STAGES[0];
}

export function stageIndex(stage: PayoutStage): number {
  return PAYOUT_STAGES.findIndex((s) => s.id === stage);
}

export function isTerminal(stage: PayoutStage): boolean {
  return stage === "rejected" || stage === "cancelled";
}

/**
 * The coarse status the rest of the platform already reads. Keeping it in step
 * with the stage means existing screens and filters carry on working.
 */
export function statusForStage(stage: PayoutStage): "PENDING" | "APPROVED" | "REJECTED" | "PAID" {
  if (stage === "rejected" || stage === "cancelled") return "REJECTED";
  if (stage === "completed") return "PAID";
  if (stage === "requested" || stage === "under_review") return "PENDING";
  return "APPROVED";
}

/**
 * Which stages are worth an email. The intermediate banking steps are progress
 * detail — visible on the timeline, but emailing each one would be noise. These
 * are the ones a contributor would actually want to hear about.
 */
export function stageNotifiesByDefault(stage: PayoutStage): boolean {
  return (
    stage === "approved" ||
    stage === "delivered" ||
    stage === "completed" ||
    stage === "rejected" ||
    stage === "cancelled"
  );
}
