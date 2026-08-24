import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SettleChargeModal } from "./SettleChargeModal";
import type { AdminPaymentMethod, PayoutRequest, SiteSettingsRow } from "../../data/db";

vi.mock("../../../lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  isSupabaseReady: () => true,
}));

const mockFetchMethods = vi.fn();
const mockFetchSettings = vi.fn();

vi.mock("../../data/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/db")>();
  return {
    ...actual,
    fetchAdminPaymentMethods: () => mockFetchMethods(),
    fetchSiteSettings: () => mockFetchSettings(),
    submitConversionFeePayment: vi.fn(async () => true),
  };
});

function method(partial: Partial<AdminPaymentMethod> = {}): AdminPaymentMethod {
  return {
    id: Math.random().toString(36).slice(2),
    methodType: "crypto",
    name: "btc",
    details: { value: "bc1qexampleaddress" },
    enabled: true,
    createdAt: "2026-08-01T00:00:00Z",
    ...partial,
  };
}

function request(): PayoutRequest {
  return {
    id: "req-1",
    photographerId: "someone-abc12345",
    amount: 10000,
    method: "local_bank",
    details: {},
    status: "APPROVED",
    stage: "currency_conversion",
    adminNote: "",
    requestedAt: "2026-08-20T10:00:00Z",
    processedAt: null,
    payoutCurrency: "EUR",
    conversionRate: 1.17,
    conversionFeePercent: 3.7,
    conversionFeeAmount: 433,
    conversionFeeBearer: "contributor",
    conversionFeeGbp: 370,
    conversionFeeStatus: "outstanding",
    conversionFeePaidAt: null,
    convertedAmount: 11700,
    transactionReference: null,
    debitedAt: null,
  };
}

const settings = (partial: Partial<SiteSettingsRow> = {}) =>
  ({
    id: 1,
    siteName: "NS CAPTURES",
    siteUrl: "https://www.nscaptures.com",
    supportEmail: "support@nscaptures.com",
    platformFee: 20,
    defaultCommission: 70,
    minPrice: 1000,
    maxFileSize: 100,
    maintenanceMode: false,
    signupEnabled: true,
    moderationRequired: true,
    conversionFeePercent: 3.7,
    ...partial,
  }) as SiteSettingsRow;

function show(methods: AdminPaymentMethod[], s: SiteSettingsRow = settings()) {
  mockFetchMethods.mockResolvedValue(methods);
  mockFetchSettings.mockResolvedValue(s);
  return render(
    <SettleChargeModal
      request={request()}
      contributorName="Jane Doe"
      onClose={() => {}}
      onSubmitted={() => {}}
    />,
  );
}

describe("SettleChargeModal", () => {
  beforeEach(() => {
    mockFetchMethods.mockReset();
    mockFetchSettings.mockReset();
  });

  it("groups methods by how the money travels, collapsed to start", async () => {
    show([
      method({ methodType: "crypto", name: "btc" }),
      method({ methodType: "bank", name: "Barclays", details: { iban: "GB33BUKB20201555555555" } }),
      method({ methodType: "paypal", name: "PayPal", details: { email: "pay@nscaptures.com" } }),
    ]);

    await screen.findByText("Crypto wallets");
    expect(screen.getByText("Bank transfer")).toBeInTheDocument();
    expect(screen.getByText("PayPal")).toBeInTheDocument();

    // Collapsed: no address is on screen until a group is opened.
    expect(screen.queryByText("bc1qexampleaddress")).not.toBeInTheDocument();
  });

  it("shows the wallet address once its group is opened", async () => {
    show([method({ details: { value: "bc1qexampleaddress", currency: "BTC" } })]);

    fireEvent.click(await screen.findByText("Crypto wallets"));

    expect(screen.getByText("bc1qexampleaddress")).toBeInTheDocument();
    expect(screen.getByText("BTC")).toBeInTheDocument();
  });

  it("collapses rows that name the same wallet at the same address", async () => {
    show([
      method({ id: "a", name: "btc", details: { value: "fbesjs" } }),
      method({ id: "b", name: "btc", details: { value: "fbesjs" } }),
      method({ id: "c", name: "btc", details: { value: "fbesjs" } }),
    ]);

    fireEvent.click(await screen.findByText("Crypto wallets"));

    expect(screen.getAllByRole("radio")).toHaveLength(1);
  });

  it("keeps wallets that differ, even under the same name", async () => {
    show([
      method({ id: "a", name: "btc", details: { value: "address-one" } }),
      method({ id: "b", name: "btc", details: { value: "address-two" } }),
    ]);

    fireEvent.click(await screen.findByText("Crypto wallets"));

    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("hides a method with no address, rather than offering a dead end", async () => {
    show([method({ name: "Crypto Wallets", details: {} })]);

    await screen.findByText("Contact the payment desk");
    expect(screen.queryByText("Crypto wallets")).not.toBeInTheDocument();
  });

  it("offers the payment desk even when nothing is published", async () => {
    show([]);

    fireEvent.click(await screen.findByText("Contact the payment desk"));

    const email = screen.getByRole("link", { name: /email the desk/i });
    expect(email).toHaveAttribute("href", expect.stringContaining("support@nscaptures.com"));
  });

  it("prefers the desk's own contacts over the general ones", async () => {
    show(
      [],
      settings({
        paymentDeskEmail: "desk@nscaptures.com",
        paymentDeskWhatsapp: "+44 7700 900123",
        paymentDeskNote: "We answer within one working day.",
      }),
    );

    fireEvent.click(await screen.findByText("Contact the payment desk"));

    expect(screen.getByRole("link", { name: /email the desk/i })).toHaveAttribute(
      "href",
      expect.stringContaining("desk@nscaptures.com"),
    );
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/447700900123",
    );
    expect(screen.getByText("We answer within one working day.")).toBeInTheDocument();
  });

  it("asks for proof only once a method has been chosen", async () => {
    show([method()]);

    expect(screen.queryByText("Proof of transfer")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByText("Crypto wallets"));
    fireEvent.click(screen.getByRole("radio"));

    await waitFor(() => expect(screen.getByText("Proof of transfer")).toBeInTheDocument());
  });

  it("will not submit without both a method and a receipt", async () => {
    show([method()]);

    const button = await screen.findByRole("button", { name: /i have paid this charge/i });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByText("Crypto wallets"));
    fireEvent.click(screen.getByRole("radio"));

    // A method alone is not enough — the receipt is still missing.
    expect(button).toBeDisabled();
  });
});
