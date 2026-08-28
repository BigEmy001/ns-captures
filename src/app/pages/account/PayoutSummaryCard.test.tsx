import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PayoutSummaryCard } from "./PayoutSummaryCard";
import type { PayoutRequest } from "../../data/db";
import { canReinitiate, statusForStage } from "../../data/payout-stages";

const base: PayoutRequest = {
  id: "3f9a1c22-77bd-4d1e-9a44-0c1b2e5f8a90",
  photographerId: "someone-1234abcd",
  amount: 10000,
  method: "local_bank",
  details: {},
  status: "APPROVED",
  stage: "processing",
  adminNote: "",
  requestedAt: "2026-08-28T09:00:00.000Z",
  processedAt: "2026-08-28T09:30:00.000Z",
  payoutCurrency: null,
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
};

describe("PayoutSummaryCard", () => {
  it("shows the amount that will actually move", () => {
    render(<PayoutSummaryCard request={base} />);
    expect(screen.getByText(/10,000\.00/)).toBeInTheDocument();
  });

  it("falls back to a reference derived from the payout id", () => {
    render(<PayoutSummaryCard request={base} />);
    expect(screen.getByText("NSC-PYT-3F9A1C22")).toBeInTheDocument();
  });

  it("prefers a real transaction reference once there is one", () => {
    render(<PayoutSummaryCard request={{ ...base, transactionReference: "FT26240ABC123" }} />);
    expect(screen.getByText("FT26240ABC123")).toBeInTheDocument();
    expect(screen.queryByText(/^NSC-PYT-/)).not.toBeInTheDocument();
  });

  it("reads RE-INITIATED — PROCESSING for a replacement transfer", () => {
    render(<PayoutSummaryCard request={{ ...base, stage: "re_initiated" }} />);
    expect(screen.getByText("RE-INITIATED — PROCESSING")).toBeInTheDocument();
  });

  it("shows the previous status when one payout replaces another", () => {
    const previous: PayoutRequest = {
      ...base,
      id: "aaaaaaaa-0000-0000-0000-000000000000",
      stage: "returned",
      status: "REJECTED",
      returnedReason: "Beneficiary bank returned the transfer",
    };
    render(
      <PayoutSummaryCard
        request={{ ...base, stage: "re_initiated", reinitiatedFrom: previous.id }}
        previous={previous}
      />,
    );
    expect(screen.getByText(/Returned \/ Cancelled/)).toBeInTheDocument();
    expect(screen.getByText(/Beneficiary bank returned the transfer/)).toBeInTheDocument();
  });

  it("says the balance is untouched only when nothing was actually debited", () => {
    render(<PayoutSummaryCard request={{ ...base, stage: "returned", status: "REJECTED" }} />);
    expect(screen.getByText(/No money has left your balance/)).toBeInTheDocument();
  });

  it("does not claim an untouched balance once the payout has been debited", () => {
    render(
      <PayoutSummaryCard
        request={{
          ...base,
          stage: "returned",
          status: "REJECTED",
          debitedAt: "2026-08-28T10:00:00.000Z",
        }}
      />,
    );
    expect(screen.queryByText(/No money has left your balance/)).not.toBeInTheDocument();
    expect(screen.getByText(/has not returned to your available balance/)).toBeInTheDocument();
  });

  it("says so when NS CAPTURES raised the withdrawal on the contributor's behalf", () => {
    render(<PayoutSummaryCard request={{ ...base, initiatedBy: "admin-uuid" }} />);
    expect(screen.getByText(/raised this withdrawal on your behalf/i)).toBeInTheDocument();
  });

  it("does not claim an assisted request when the contributor made it themselves", () => {
    render(<PayoutSummaryCard request={base} />);
    expect(screen.queryByText(/on your behalf/i)).not.toBeInTheDocument();
  });

  it("omits an estimated arrival rather than inventing one", () => {
    render(<PayoutSummaryCard request={base} />);
    expect(screen.queryByText(/Estimated Arrival/i)).not.toBeInTheDocument();
  });
});

describe("returned and re-initiated stages", () => {
  it("treats a returned payout as one that can be replaced", () => {
    expect(canReinitiate("returned")).toBe(true);
    expect(canReinitiate("cancelled")).toBe(true);
    expect(canReinitiate("processing")).toBe(false);
    expect(canReinitiate("completed")).toBe(false);
  });

  it("does not leave a returned payout looking approved", () => {
    expect(statusForStage("returned")).toBe("REJECTED");
    expect(statusForStage("re_initiated")).toBe("APPROVED");
  });
});
