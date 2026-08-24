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

export type PayoutMethod = "card" | "local_bank" | "crypto" | "paypal";

/**
 * Which stages a payout actually passes through, by method.
 *
 * A bank transfer really does cross correspondent banks and a recipient bank,
 * and can sit in each for a day. A crypto payout does not: it is reviewed,
 * approved, broadcast, and confirmed. Showing a wallet payout ten steps — seven
 * of which can never happen — would be theatre, and would make the timeline
 * look stuck rather than informative.
 */
const METHOD_STAGE_IDS: Record<PayoutMethod, PayoutStage[]> = {
  card: [
    "requested",
    "under_review",
    "approved",
    "processing",
    "currency_conversion",
    "network_processing",
    "intermediary_processing",
    "recipient_bank_processing",
    "delivered",
    "completed",
  ],
  local_bank: [
    "requested",
    "under_review",
    "approved",
    "processing",
    "currency_conversion",
    "network_processing",
    "recipient_bank_processing",
    "delivered",
    "completed",
  ],
  crypto: ["requested", "under_review", "approved", "network_processing", "completed"],
  paypal: ["requested", "under_review", "approved", "network_processing", "completed"],
};

/** Wording that differs by method, where the generic label would mislead. */
const METHOD_OVERRIDES: Partial<
  Record<PayoutMethod, Partial<Record<PayoutStage, PayoutStageMeta>>>
> = {
  crypto: {
    network_processing: {
      id: "network_processing",
      label: "Transaction Sent",
      body: "Your payout has been broadcast to the network. The transaction reference is below.",
      adminBody: "Broadcast to the network. Record the transaction hash.",
    },
    completed: {
      id: "completed",
      label: "Confirmed",
      body: "The transaction has confirmed and the funds are in your wallet.",
      adminBody: "Confirmed on chain. Closes the payout and settles the ledger.",
    },
  },
  paypal: {
    network_processing: {
      id: "network_processing",
      label: "Payment Sent",
      body: "Your payout has been sent to your PayPal account.",
      adminBody: "Sent through PayPal. Record the transaction reference.",
    },
  },
};

export function stagesForMethod(method: string | undefined): PayoutStageMeta[] {
  const ids = METHOD_STAGE_IDS[(method as PayoutMethod) || "card"] || METHOD_STAGE_IDS.card;
  const overrides = METHOD_OVERRIDES[(method as PayoutMethod) || "card"] || {};

  return ids.map(
    (id) => overrides[id] || PAYOUT_STAGES.find((s) => s.id === id) || PAYOUT_STAGES[0],
  );
}

/** The label for one stage, in the wording that method uses. */
export function stageMetaFor(method: string | undefined, stage: PayoutStage): PayoutStageMeta {
  const overrides = METHOD_OVERRIDES[(method as PayoutMethod) || "card"] || {};
  return overrides[stage] || stageMeta(stage);
}

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

/**
 * Whether an outstanding conversion charge blocks this move.
 *
 * The charge is billed separately rather than deducted, so nothing collects it
 * automatically. If the payout were allowed to run to completion while it was
 * still owed, there would be no leverage left to collect it and no obvious
 * moment at which anyone would notice. A payout therefore stops at the
 * conversion step until the recipient has settled.
 */
export function chargeBlocksStage(
  stage: PayoutStage,
  feeStatus: string | null | undefined,
): boolean {
  if (feeStatus !== "outstanding") return false;

  // Ending the payout is always allowed; only carrying it forward is held.
  const ADVANCING: PayoutStage[] = [
    "network_processing",
    "intermediary_processing",
    "recipient_bank_processing",
    "delivered",
    "completed",
  ];

  return ADVANCING.includes(stage);
}

/**
 * What a contributor can actually request. Their balance is not debited until
 * a payout is approved, so anything already awaiting a decision has to be held
 * back — otherwise the same money can be requested twice.
 */
export function availableForPayout(
  balance: number,
  requests: { amount: number; status: string; stage?: PayoutStage }[],
): number {
  const reserved = requests
    .filter((r) => r.status === "PENDING")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return Math.max(0, (balance || 0) - reserved);
}
