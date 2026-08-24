import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AgreementsTab } from "./AgreementsTab";
import type { Agreement } from "../../../data/db";

vi.mock("../../../../lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  isSupabaseReady: () => true,
}));

const mockFetch = vi.fn();
const mockSign = vi.fn();
const mockDecline = vi.fn();

vi.mock("../../../data/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/db")>();
  return {
    ...actual,
    fetchAgreements: (...a: unknown[]) => mockFetch(...a),
    signAgreement: (...a: unknown[]) => mockSign(...a),
    declineAgreement: (...a: unknown[]) => mockDecline(...a),
  };
});

vi.mock("../../../../lib/email", () => ({ sendAgreementSigned: vi.fn(async () => {}) }));

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      name: "Søren Kjær-Hansen",
      email: "soren@example.com",
      contributorId: "NSC-000204",
    },
  }),
}));

// Shaped like the real document: a preamble, then numbered capitalised
// headings separated by horizontal rules.
const BODY = `INTERNATIONAL CONTRIBUTOR AGREEMENT

Agreement Reference: NSC-CA-2026-A4F1
Name: Søren Kjær-Hansen

───

1. PURPOSE OF THIS AGREEMENT

This Agreement establishes the general terms of participation.

───

23. PAYMENT AND CONTRIBUTOR EARNINGS

Payments shall be determined according to the applicable transaction.

───

45. GOVERNING LAW

The laws of England and Wales shall apply.`;

function agreement(partial: Partial<Agreement> = {}): Agreement {
  return {
    id: "a1",
    reference: "NSC-CA-2026-A4F1",
    kind: "contributor",
    title: "International Contributor Agreement",
    version: "1.0",
    body: BODY,
    status: "awaiting_signature",
    acquisitionId: null,
    signedName: null,
    signedAt: null,
    effectiveDate: "2026-08-24",
    createdAt: "2026-08-24T10:00:00Z",
    ...partial,
  } as Agreement;
}

const open = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /review agreement/i }));
};

describe("AgreementsTab", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockSign.mockReset();
    mockDecline.mockReset();
    mockFetch.mockResolvedValue([agreement()]);
  });

  it("reads a section at a time rather than as one long scroll", async () => {
    render(<AgreementsTab />);
    await open();

    await screen.findByText("1. PURPOSE OF THIS AGREEMENT");
    expect(screen.getByText("23. PAYMENT AND CONTRIBUTOR EARNINGS")).toBeInTheDocument();
    expect(screen.getByText("45. GOVERNING LAW")).toBeInTheDocument();

    // A closed section's text is not on screen.
    expect(screen.queryByText(/laws of England and Wales/)).not.toBeInTheDocument();
  });

  it("opens a section when its heading is clicked", async () => {
    render(<AgreementsTab />);
    await open();

    fireEvent.click(await screen.findByText("45. GOVERNING LAW"));
    expect(screen.getByText(/laws of England and Wales/)).toBeInTheDocument();
  });

  it("can still show the whole thing at once", async () => {
    render(<AgreementsTab />);
    await open();

    fireEvent.click(await screen.findByRole("button", { name: /read it all at once/i }));

    // Every clause on screen together, headings included as plain text.
    expect(screen.getByText(/laws of England and Wales/)).toBeInTheDocument();
    expect(screen.getByText(/Payments shall be determined/)).toBeInTheDocument();
  });

  it("shows the filled-in details, not placeholders", async () => {
    render(<AgreementsTab />);
    await open();

    // The preamble carries the contributor's own name and reference.
    expect(screen.getByText(/Søren Kjær-Hansen/)).toBeInTheDocument();
    expect(screen.queryByText(/\[FULL LEGAL NAME\]/)).not.toBeInTheDocument();
  });

  it("offers both answers while it awaits one", async () => {
    render(<AgreementsTab />);
    await open();

    expect(await screen.findByRole("button", { name: /sign agreement/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^decline$/i })).toBeInTheDocument();
  });

  it("will not sign until it is both confirmed and named", async () => {
    render(<AgreementsTab />);
    await open();

    const sign = await screen.findByRole("button", { name: /sign agreement/i });
    expect(sign).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(sign).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Søren Kjær-Hansen|your full name/i), {
      target: { value: "Søren Kjær-Hansen" },
    });
    await waitFor(() => expect(sign).toBeEnabled());
  });

  it("asks before declining, and records the reason", async () => {
    mockDecline.mockResolvedValue(true);
    render(<AgreementsTab />);
    await open();

    fireEvent.click(await screen.findByRole("button", { name: /^decline$/i }));
    expect(await screen.findByText("Decline this agreement?")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/would like us to know/i), {
      target: { value: "The territory is too broad." },
    });
    fireEvent.click(screen.getByRole("button", { name: /yes, decline/i }));

    await waitFor(() =>
      expect(mockDecline).toHaveBeenCalledWith("a1", "The territory is too broad."),
    );
  });

  it("offers a download only once it has been answered", async () => {
    render(<AgreementsTab />);
    await screen.findByRole("button", { name: /review agreement/i });
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();

    mockFetch.mockResolvedValue([
      agreement({
        status: "signed",
        signedName: "Søren Kjær-Hansen",
        signedAt: "2026-08-24T11:00:00Z",
      }),
    ]);
    render(<AgreementsTab />);
    expect(await screen.findByRole("button", { name: /download/i })).toBeInTheDocument();
  });
});
