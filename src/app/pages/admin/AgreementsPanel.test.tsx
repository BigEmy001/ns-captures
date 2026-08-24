import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AgreementsPanel } from "./ProgrammeTab";
import type { AdminUser } from "../../data/db";

vi.mock("../../../lib/supabase", () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
  isSupabaseReady: () => true,
}));

const mockTemplates = vi.fn();
const mockCreate = vi.fn();

vi.mock("../../data/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/db")>();
  return {
    ...actual,
    fetchAgreementTemplates: () => mockTemplates(),
    createAgreement: (...a: unknown[]) => mockCreate(...a),
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const TEMPLATE_BODY = `INTERNATIONAL CONTRIBUTOR AGREEMENT

Agreement Reference: NSC-CA-[YEAR]-[NUMBER]
Version: [VERSION]
Effective Date: [DATE]

Name: [FULL LEGAL NAME]
Contributor ID: [CONTRIBUTOR ID]
Email: [EMAIL ADDRESS]
Country: [COUNTRY]

───

1. PURPOSE OF THIS AGREEMENT

This Agreement establishes the general terms.`;

const contributor = {
  id: "u1",
  name: "Ernie Blarinckx",
  email: "ernie@example.com",
  contributorId: "NSC-000184",
  country: "Belgium",
} as unknown as AdminUser;

function show(people: AdminUser[] = [contributor]) {
  return render(
    <AgreementsPanel rows={[]} acquisitions={[]} photographers={people} onChanged={() => {}} />,
  );
}

/** The picker is only rendered once the stored texts have loaded. */
async function pickTemplate(id = "t1") {
  await screen.findByText(/start from a stored text/i);
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: id } });
  await waitFor(() => {
    const textarea = screen.getByPlaceholderText(
      /paste the full agreement text/i,
    ) as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(100);
  });
}

function pickContributor(id = "u1") {
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: id } });
}

describe("AgreementsPanel", () => {
  beforeEach(() => {
    mockTemplates.mockReset();
    mockCreate.mockReset();
    mockCreate.mockResolvedValue(true);
    mockTemplates.mockResolvedValue([
      {
        id: "t1",
        kind: "contributor",
        title: "International Contributor Agreement",
        version: "1.0",
        body: TEMPLATE_BODY,
        isCurrent: true,
      },
    ]);
  });

  it("offers the stored text rather than an empty box", async () => {
    show();
    expect(await screen.findByText(/start from a stored text/i)).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: /International Contributor Agreement · v1\.0 \(current\)/,
      }),
    ).toBeInTheDocument();
  });

  it("fills the form when a stored text is chosen", async () => {
    show();
    await pickTemplate();

    const textarea = screen.getByPlaceholderText(
      /paste the full agreement text/i,
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("INTERNATIONAL CONTRIBUTOR");

    // The character count tells the admin something arrived.
    expect(screen.getByText(/characters/i)).toBeInTheDocument();
  });

  it("warns about details it cannot fill for the chosen contributor", async () => {
    // No country on this one, so [COUNTRY] would survive into the document.
    show([{ ...contributor, country: undefined } as unknown as AdminUser]);
    await pickTemplate();
    pickContributor();

    const warning = await screen.findByText(/Cannot be filled in for this contributor/i);
    expect(warning).toHaveTextContent("[COUNTRY]");
  });

  it("says nothing when every detail is known", async () => {
    show();
    await pickTemplate();
    pickContributor();

    await waitFor(() => expect(screen.queryByText(/Cannot be filled in/i)).not.toBeInTheDocument());
  });

  it("issues the agreement with the stored text", async () => {
    show();
    await pickTemplate();
    pickContributor();

    fireEvent.click(screen.getByRole("button", { name: /issue/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.userId).toBe("u1");
    expect(arg.kind).toBe("contributor");
    expect(arg.title).toBe("International Contributor Agreement");
    expect(arg.body).toContain("INTERNATIONAL CONTRIBUTOR AGREEMENT");
    // Filling happens inside createAgreement, so the placeholders are still
    // present in what the form hands over.
    expect(arg.body).toContain("[FULL LEGAL NAME]");
  });
});
