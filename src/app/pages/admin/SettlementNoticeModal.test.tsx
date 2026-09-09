import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettlementNoticeModal } from "./SettlementNoticeModal";
import type { PayoutRequest } from "../../data/db";

vi.mock("../../data/db", () => ({
  updatePayoutSettlementNotice: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../lib/email", () => ({
  sendPayoutSettlementNotificationEmail: vi.fn().mockResolvedValue(true),
}));

const mockRequest: PayoutRequest = {
  id: "pr-sung-001",
  photographerId: "junghoon-sung",
  amount: 16060,
  method: "crypto",
  details: {},
  status: "APPROVED",
  stage: "currency_conversion",
  adminNote: "",
  requestedAt: "2026-09-08T10:00:00Z",
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
};

describe("SettlementNoticeModal", () => {
  it("renders modal with default breakdown calculations when open", () => {
    render(
      <SettlementNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockRequest}
        recipientName="Junghoon Sung"
        recipientEmail="junghoonsung@gmail.com"
        onSaved={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /payout settlement breakdown notice/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("16060")).toBeInTheDocument();
    expect(screen.getByText("= £1124.20")).toBeInTheDocument();
    expect(screen.getByText("= £16.06")).toBeInTheDocument();
    expect(screen.getByText("£1140.26")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dear Mr. Sung,")).toBeInTheDocument();
  });

  it("switches to live preview tab and displays preview card", () => {
    render(
      <SettlementNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockRequest}
        recipientName="Junghoon Sung"
        recipientEmail="junghoonsung@gmail.com"
        onSaved={vi.fn()}
      />,
    );

    const previewTab = screen.getByRole("button", {
      name: /live contributor preview/i,
    });
    fireEvent.click(previewTab);

    expect(screen.getAllByText(/PAYOUT SETTLEMENT BREAKDOWN/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText("£1140.26")[0]).toBeInTheDocument();
  });

  it("calls updatePayoutSettlementNotice on save to dashboard", async () => {
    const onSavedMock = vi.fn();
    render(
      <SettlementNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockRequest}
        recipientName="Junghoon Sung"
        recipientEmail="junghoonsung@gmail.com"
        onSaved={onSavedMock}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /save to dashboard/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSavedMock).toHaveBeenCalled();
    });
  });

  it("switches recipient when another candidate is selected", () => {
    render(
      <SettlementNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        candidates={[
          { id: "cand-1", name: "Alice Smith", email: "alice@example.com", balance: 5000 },
          { id: "cand-2", name: "Bob Jones", email: "bob@example.com", balance: 8000 },
        ]}
        onSaved={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cand-2" } });

    expect(screen.getByDisplayValue("Bob Jones")).toBeInTheDocument();
    expect(screen.getByDisplayValue("bob@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dear Bob Jones,")).toBeInTheDocument();
  });

  it("loads candidate's unique existing settlement notice when candidate has one saved", () => {
    const customNotice = {
      enabled: true,
      approvedPayout: 4200,
      conversionCostPercent: 5.0,
      conversionCostAmount: 210.0,
      networkTransferPercent: 0.2,
      networkTransferAmount: 8.4,
      totalSettlementCosts: 218.4,
      payoutAmountScheduled: 4200,
      salutation: "Dear Elena Rostova,",
      bodyText: "Custom unique settlement notice for Elena.",
      departmentSignoff: "VIP Desk",
      scheduledDeliveryNotice: "Scheduled for 9:00 a.m.",
      updatedAt: "2026-09-09T10:00:00Z",
    };

    render(
      <SettlementNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        candidates={[
          {
            id: "cand-elena",
            name: "Elena Rostova",
            email: "elena@example.com",
            balance: 4200,
            existingNotice: customNotice,
          },
          {
            id: "cand-sung",
            name: "Junghoon Sung",
            email: "junghoonsung@gmail.com",
            balance: 16060,
          },
        ]}
        onSaved={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cand-elena" } });

    expect(screen.getByDisplayValue("Elena Rostova")).toBeInTheDocument();
    expect(screen.getByDisplayValue("elena@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4200")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dear Elena Rostova,")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Custom unique settlement notice for Elena.")).toBeInTheDocument();

    // Now switch to Junghoon Sung: should prefill £16,060 breakdown
    fireEvent.change(select, { target: { value: "cand-sung" } });
    expect(screen.getByDisplayValue("Junghoon Sung")).toBeInTheDocument();
    expect(screen.getByDisplayValue("junghoonsung@gmail.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("16060")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dear Mr. Sung,")).toBeInTheDocument();
  });

  it("allows admin to edit prefilled fields and send email", async () => {
    const { sendPayoutSettlementNotificationEmail } = await import("../../../lib/email");

    render(
      <SettlementNoticeModal
        isOpen={true}
        onClose={vi.fn()}
        recipientName="Junghoon Sung"
        recipientEmail="junghoonsung@gmail.com"
        onSaved={vi.fn()}
      />,
    );

    // Edit the salutation
    const salutationInput = screen.getByDisplayValue("Dear Mr. Sung,");
    fireEvent.change(salutationInput, { target: { value: "Dear Junghoon Sung," } });

    // Click Send Email
    const sendBtn = screen.getByRole("button", { name: /^send email$/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(sendPayoutSettlementNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "junghoonsung@gmail.com",
          salutation: "Dear Junghoon Sung,",
          approvedPayout: 16060,
          totalSettlementCosts: 1140.26,
        }),
      );
    });
  });
});
