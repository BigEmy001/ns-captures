import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InitiatePayoutPanel, type PayoutCandidate } from "./InitiatePayoutPanel";

const initiate = vi.hoisted(() => vi.fn());
vi.mock("../../data/db", () => ({ adminInitiatePayout: initiate }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Photographers and contributors both sell work and both get paid. The payout
// screens must not quietly become programme-members-only.
const candidates: PayoutCandidate[] = [
  { slug: "kelsy-hagemeier-748cdd17", name: "Kelsy Hagemeier", balance: 166480 },
  { slug: "ernie-blarinckx-45620e9f", name: "Ernie Blarinckx", balance: 236350 },
];

const open = () => fireEvent.click(screen.getByRole("button", { name: /Raise a withdrawal/i }));

describe("InitiatePayoutPanel", () => {
  beforeEach(() => {
    initiate.mockReset();
    initiate.mockResolvedValue({ ok: true, id: "new-payout-id" });
  });

  it("offers a photographer as readily as a contributor", () => {
    render(<InitiatePayoutPanel candidates={candidates} onCreated={vi.fn()} />);
    open();
    expect(screen.getByRole("option", { name: /Kelsy Hagemeier/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Ernie Blarinckx/ })).toBeInTheDocument();
  });

  it("shows each person's available balance", () => {
    render(<InitiatePayoutPanel candidates={candidates} onCreated={vi.fn()} />);
    open();
    expect(screen.getByRole("option", { name: /£166,480 available/ })).toBeInTheDocument();
  });

  it("will not raise a withdrawal for more than the balance", () => {
    render(<InitiatePayoutPanel candidates={candidates} onCreated={vi.fn()} />);
    open();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "kelsy-hagemeier-748cdd17" },
    });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "999999" } });

    expect(screen.getByText(/Over the available balance/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Raise withdrawal/i })).toBeDisabled();
  });

  it("raises the withdrawal against the chosen account", async () => {
    const onCreated = vi.fn();
    render(<InitiatePayoutPanel candidates={candidates} onCreated={onCreated} />);
    open();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "kelsy-hagemeier-748cdd17" },
    });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: /Raise withdrawal/i }));

    await waitFor(() => expect(initiate).toHaveBeenCalled());
    const [slug, amount, method] = initiate.mock.calls[0];
    expect(slug).toBe("kelsy-hagemeier-748cdd17");
    expect(amount).toBe(2500);
    expect(method).toBe("local_bank");
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it("stays disabled until a contributor and a positive amount are chosen", () => {
    render(<InitiatePayoutPanel candidates={candidates} onCreated={vi.fn()} />);
    open();
    const submit = screen.getByRole("button", { name: /Raise withdrawal/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "kelsy-hagemeier-748cdd17" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "0" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "50" } });
    expect(submit).toBeEnabled();
  });
});
