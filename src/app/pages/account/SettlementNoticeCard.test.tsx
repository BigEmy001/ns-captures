import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettlementNoticeCard } from "./SettlementNoticeCard";
import type { PayoutRequest, PayoutSettlementNotice } from "../../data/db";

const mockNotice: PayoutSettlementNotice = {
  enabled: true,
  scheduledDeliveryNotice:
    "This message was automatically scheduled for delivery at 7:00 a.m. in the recipient's local time for convenience.",
  approvedPayout: 16060.0,
  conversionCostPercent: 7.0,
  conversionCostAmount: 1124.2,
  networkTransferPercent: 0.1,
  networkTransferAmount: 16.06,
  totalSettlementCosts: 1140.26,
  payoutAmountScheduled: 16060.0,
  salutation: "Dear Mr. Sung,",
  bodyText: "We are pleased to confirm that your payout of £16,060.00 has been approved.",
  departmentSignoff: "Kind regards,\nFinance & Settlement Department\nNS CAPTURES",
};

const mockRequest: PayoutRequest = {
  id: "pr-123",
  photographerId: "junghoon-sung",
  amount: 16060,
  method: "crypto",
  details: {
    settlementNotice: mockNotice,
  },
  status: "APPROVED",
  stage: "currency_conversion",
  adminNote: "",
  requestedAt: "2026-09-08T10:00:00Z",
  processedAt: null,
  payoutCurrency: "USDT",
  conversionRate: 1.28,
  conversionFeePercent: 7.0,
  conversionFeeAmount: 1124.2,
  conversionFeeBearer: "contributor",
  conversionFeeGbp: 1140.26,
  conversionFeeStatus: "outstanding",
  conversionFeePaidAt: null,
  convertedAmount: 20556.8,
  transactionReference: null,
  debitedAt: "2026-09-08T10:05:00Z",
};

describe("SettlementNoticeCard", () => {
  it("renders notice header, amounts and salutation correctly", () => {
    render(<SettlementNoticeCard notice={mockNotice} request={mockRequest} />);

    expect(
      screen.getByText(/AUTOMATED SYSTEM NOTIFICATION/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/7:00 a.m./i)).toBeInTheDocument();
    expect(screen.getAllByText("£16,060.00")).toHaveLength(2);
    expect(screen.getByText("£1,124.20")).toBeInTheDocument();
    expect(screen.getByText("£16.06")).toBeInTheDocument();
    expect(screen.getByText("£1,140.26")).toBeInTheDocument();
    expect(screen.getByText("Dear Mr. Sung,")).toBeInTheDocument();
  });

  it("calls onSettleCharge when settle charge button is clicked", () => {
    const onSettleMock = vi.fn();
    render(
      <SettlementNoticeCard
        notice={mockNotice}
        request={mockRequest}
        onSettleCharge={onSettleMock}
      />,
    );

    const settleBtn = screen.getByRole("button", { name: /settle charge/i });
    expect(settleBtn).toBeInTheDocument();
    fireEvent.click(settleBtn);
    expect(onSettleMock).toHaveBeenCalledWith(mockRequest);
  });

  it("returns null if notice is disabled", () => {
    const { container } = render(
      <SettlementNoticeCard
        notice={{ ...mockNotice, enabled: false }}
        request={mockRequest}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
