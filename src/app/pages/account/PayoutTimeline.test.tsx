import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PayoutTimeline } from "./PayoutTimeline";
import type { PayoutRequest } from "../../data/db";

vi.mock("../../../lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  isSupabaseReady: () => true,
}));

const mockFetchPayoutEvents = vi.fn();

vi.mock("../../data/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/db")>();
  return { ...actual, fetchPayoutEvents: (...a: unknown[]) => mockFetchPayoutEvents(...a) };
});

function request(partial: Partial<PayoutRequest> = {}): PayoutRequest {
  return {
    id: "req-1",
    photographerId: "someone-abc12345",
    amount: 10000,
    method: "card",
    details: {},
    status: "APPROVED",
    stage: "processing",
    adminNote: "",
    requestedAt: "2026-08-20T10:00:00Z",
    processedAt: null,
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
    ...partial,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchPayoutEvents.mockResolvedValue([
    { id: "e1", stage: "requested", note: null, createdAt: "2026-08-20T10:00:00Z" },
    { id: "e2", stage: "under_review", note: null, createdAt: "2026-08-20T11:00:00Z" },
  ]);
});

describe("PayoutTimeline renders without crashing", () => {
  it("renders a bank payout", async () => {
    render(<PayoutTimeline request={request()} />);
    expect(await screen.findByText("Payout Requested")).toBeInTheDocument();
    expect(screen.getByText("Bank / Payment Network Processing")).toBeInTheDocument();
  });

  it("renders a crypto payout with its shorter journey", async () => {
    render(<PayoutTimeline request={request({ method: "crypto", stage: "approved" })} />);
    expect(await screen.findByText("Transaction Sent")).toBeInTheDocument();
    // A wallet payout never crosses a correspondent bank.
    expect(screen.queryByText("Intermediary Bank Processing")).not.toBeInTheDocument();
  });

  it("renders a payout whose stage is not in its own journey", async () => {
    // A method changed after the fact, or a bank stage on a crypto payout.
    render(
      <PayoutTimeline
        request={request({ method: "crypto", stage: "recipient_bank_processing" })}
      />,
    );
    expect(await screen.findByText("Payout Requested")).toBeInTheDocument();
  });

  it("renders a terminal payout", async () => {
    render(<PayoutTimeline request={request({ stage: "rejected", adminNote: "Not this time" })} />);
    expect(await screen.findByText("Payout Rejected")).toBeInTheDocument();
  });

  it("renders a conversion with an outstanding charge", async () => {
    render(
      <PayoutTimeline
        request={request({
          stage: "currency_conversion",
          payoutCurrency: "KRW",
          conversionRate: 1750,
          conversionFeePercent: 3.7,
          conversionFeeAmount: 647500,
          conversionFeeGbp: 370,
          conversionFeeBearer: "contributor",
          conversionFeeStatus: "outstanding",
          convertedAmount: 17500000,
        })}
        onSettleCharge={() => {}}
      />,
    );
    expect(await screen.findByText(/Conversion charge outstanding/)).toBeInTheDocument();
  });

  it("renders when there are no events yet", async () => {
    mockFetchPayoutEvents.mockResolvedValue([]);
    render(<PayoutTimeline request={request()} />);
    expect(await screen.findByText("Payout Requested")).toBeInTheDocument();
  });

  it("renders when the events call fails outright", async () => {
    mockFetchPayoutEvents.mockRejectedValue(new Error("network down"));
    render(<PayoutTimeline request={request()} />);
    // Must not be left on the loading state forever, and must not crash.
    await waitFor(() => expect(screen.queryByText("Loading timeline…")).not.toBeInTheDocument());
  });
});
