import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAllAcquisitions,
  createAcquisition,
  updateAcquisitionStatus,
  fetchAllAgreements,
  createAgreement,
  fetchAgreementTemplates,
  type AgreementTemplate,
  awardBonus,
  fetchAllPublicationEntries,
  createPublicationEntry,
  updatePublicationStatus,
  type Acquisition,
  type AcquisitionCategory,
  type AcquisitionRights,
  type AcquisitionStatus,
  type Agreement,
  type PublicationEntry,
  type PublicationStatus,
  type AdminUser,
  type Photo,
} from "../../data/db";
import { ProposalsPanel } from "./ProposalsPanel";
import { unfilledPlaceholders } from "../../../lib/agreement";

const SUB_TABS = [
  { id: "proposals", label: "Proposals" },
  { id: "acquisitions", label: "Acquisitions" },
  { id: "agreements", label: "Agreements" },
  { id: "bonuses", label: "Bonuses & Awards" },
  { id: "publications", label: "Publications" },
] as const;

type SubTab = (typeof SUB_TABS)[number]["id"];

/** Indicative rates from the programme proposal — a starting point, editable. */
const CATEGORY_RATES: Record<AcquisitionCategory, number> = {
  standard: 150,
  premium: 300,
  signature: 450,
  exceptional: 650,
};

const CATEGORY_LABELS: Record<AcquisitionCategory, string> = {
  standard: "Standard Selection",
  premium: "Premium Selection",
  signature: "Signature Selection",
  exceptional: "Exceptional / Collection",
};

const RIGHTS_LABELS: Record<AcquisitionRights, string> = {
  non_exclusive: "Non-exclusive licence",
  exclusive: "Exclusive licence",
  assignment: "Copyright assignment",
};

const ACQUISITION_STATUSES: AcquisitionStatus[] = [
  "under_consideration",
  "offer_made",
  "awaiting_contributor",
  "agreement_pending",
  "agreement_signed",
  "payment_pending",
  "paid",
  "declined",
  "cancelled",
];

const STATUS_LABELS: Record<AcquisitionStatus, string> = {
  under_consideration: "Under consideration",
  offer_made: "Offer made",
  awaiting_contributor: "Awaiting contributor",
  agreement_pending: "Agreement pending",
  agreement_signed: "Agreement signed",
  payment_pending: "Payment pending",
  paid: "Paid",
  declined: "Declined",
  cancelled: "Cancelled",
};

const PUBLICATION_STATUSES: PublicationStatus[] = [
  "under_consideration",
  "shortlisted",
  "selected",
  "published",
  "not_selected",
];

const label = "font-mono text-[9px] tracking-wider text-[#758078] uppercase";
const field =
  "mt-1.5 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]";
const card = "rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm";
const primary =
  "rounded-full bg-[#1e4a3f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40";

function money(n: number) {
  return `£${Math.round(n).toLocaleString()}`;
}

export function ProgrammeTab({
  contributors,
  assets,
}: {
  contributors: AdminUser[];
  assets: Photo[];
}) {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubTab>("proposals");

  const [acquisitions, setAcquisitions] = useState<(Acquisition & { userName?: string })[]>([]);
  const [agreements, setAgreements] = useState<(Agreement & { userName?: string })[]>([]);
  const [publications, setPublications] = useState<(PublicationEntry & { userName?: string })[]>(
    [],
  );

  // Acquisitions, agreements, bonuses and publications are programme
  // business, so only contributors appear here.
  const photographers = useMemo(
    () => contributors.filter((c) => c.role === "Contributor"),
    [contributors],
  );

  const reload = () => {
    fetchAllAcquisitions().then(setAcquisitions);
    fetchAllAgreements().then(setAgreements);
    fetchAllPublicationEntries().then(setPublications);
  };

  useEffect(reload, []);

  /** Photographs belonging to the selected contributor, by slug. */
  const photosFor = (userId: string) => {
    const slug = photographers.find((p) => p.id === userId)?.slug;
    return slug ? assets.filter((a) => a.photographerId === slug) : [];
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-1 border-b border-[#ececec]">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              sub === t.id
                ? "border-[#1e4a3f] text-[#1e4a3f]"
                : "border-transparent text-[#6b716d] hover:text-[#18211f]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "proposals" && <ProposalsPanel />}

      {sub === "acquisitions" && (
        <AcquisitionsPanel
          rows={acquisitions}
          photographers={photographers}
          photosFor={photosFor}
          onChanged={reload}
        />
      )}

      {sub === "agreements" && (
        <AgreementsPanel
          rows={agreements}
          acquisitions={acquisitions}
          photographers={photographers}
          onChanged={reload}
        />
      )}

      {sub === "bonuses" && (
        <BonusesPanel photographers={photographers} adminId={user?.id} onChanged={reload} />
      )}

      {sub === "publications" && (
        <PublicationsPanel
          rows={publications}
          photographers={photographers}
          photosFor={photosFor}
          onChanged={reload}
        />
      )}
    </div>
  );
}

// ── Acquisitions ────────────────────────────────────────────────────

function AcquisitionsPanel({
  rows,
  photographers,
  photosFor,
  onChanged,
}: {
  rows: (Acquisition & { userName?: string })[];
  photographers: AdminUser[];
  photosFor: (userId: string) => Photo[];
  onChanged: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [photoId, setPhotoId] = useState("");
  const [category, setCategory] = useState<AcquisitionCategory>("premium");
  const [amount, setAmount] = useState(String(CATEGORY_RATES.premium));
  const [rights, setRights] = useState<AcquisitionRights>("non_exclusive");
  const [territory, setTerritory] = useState("Worldwide");
  const [term, setTerm] = useState("");
  const [permittedUses, setPermittedUses] = useState("");
  const [selectionNote, setSelectionNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const photos = userId ? photosFor(userId) : [];

  const chooseCategory = (next: AcquisitionCategory) => {
    setCategory(next);
    setAmount(String(CATEGORY_RATES[next]));
  };

  const submit = async () => {
    if (!userId || !photoId) {
      toast.error("Choose a contributor and a photograph");
      return;
    }

    setIsSaving(true);
    const created = await createAcquisition({
      userId,
      photoId,
      category,
      amount: Number(amount) || 0,
      rights,
      territory,
      term: term || undefined,
      permittedUses: permittedUses || undefined,
      selectionNote: selectionNote || undefined,
    });
    setIsSaving(false);

    if (!created) {
      toast.error("Could not create the acquisition");
      return;
    }

    toast.success(`Offer ${created.reference} created`, {
      description: "The contributor can see it under Direct Acquisitions.",
    });
    setPhotoId("");
    setSelectionNote("");
    onChanged();
  };

  const move = async (row: Acquisition, status: AcquisitionStatus) => {
    const ok = await updateAcquisitionStatus(row, status);
    if (!ok) {
      toast.error("Could not update the acquisition");
      return;
    }
    toast.success(
      status === "paid"
        ? `${money(row.amount)} credited to the contributor's balance`
        : `Moved to ${STATUS_LABELS[status]}`,
    );
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="font-serif text-lg text-[#18211f]">Create an acquisition offer</h3>
        <p className="mt-1 text-sm text-[#6b716d]">
          An offer applies to one named photograph. Marking it paid credits the contributor's
          balance and records the earning.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={label}>Contributor</span>
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPhotoId("");
              }}
              className={field}
            >
              <option value="">Select contributor</option>
              {photographers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.contributorId ? `· ${p.contributorId}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Photograph</span>
            <select
              value={photoId}
              onChange={(e) => setPhotoId(e.target.value)}
              disabled={!userId}
              className={field}
            >
              <option value="">
                {userId ? "Select photograph" : "Choose a contributor first"}
              </option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Category</span>
            <select
              value={category}
              onChange={(e) => chooseCategory(e.target.value as AcquisitionCategory)}
              className={field}
            >
              {(Object.keys(CATEGORY_LABELS) as AcquisitionCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]} · {money(CATEGORY_RATES[c])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Acquisition amount (£)</span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Rights arrangement</span>
            <select
              value={rights}
              onChange={(e) => setRights(e.target.value as AcquisitionRights)}
              className={field}
            >
              {(Object.keys(RIGHTS_LABELS) as AcquisitionRights[]).map((r) => (
                <option key={r} value={r}>
                  {RIGHTS_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Territory</span>
            <input
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Term</span>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. 5 years"
              className={field}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className={label}>Permitted uses</span>
            <input
              value={permittedUses}
              onChange={(e) => setPermittedUses(e.target.value)}
              placeholder="Commercial, editorial and collection purposes"
              className={field}
            />
          </label>

          <label className="block lg:col-span-3">
            <span className={label}>
              Why this photograph was selected (shown to the contributor)
            </span>
            <input
              value={selectionNote}
              onChange={(e) => setSelectionNote(e.target.value)}
              placeholder="Selected for its documentary value and representation of contemporary Seoul."
              className={field}
            />
          </label>
        </div>

        {rights === "assignment" && (
          <p className="mt-4 rounded-xl bg-[#f6ecd8] p-3 text-xs text-[#7a5a17]">
            A copyright assignment transfers ownership, not just permission to use. It must be
            documented in writing and signed — issue the matching agreement before marking this
            paid.
          </p>
        )}

        <button onClick={submit} disabled={isSaving} className={`${primary} mt-5`}>
          {isSaving ? "Creating…" : "Create offer"}
        </button>
      </div>

      <div className={`${card} p-0`}>
        <h3 className="px-6 pt-6 font-serif text-lg text-[#18211f]">All acquisitions</h3>
        {rows.length === 0 ? (
          <p className="px-6 pt-2 pb-6 text-sm text-[#6b716d]">
            No acquisitions yet. Create one above and it appears on the contributor's Direct
            Acquisitions page.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className={`border-b border-[#ececec] ${label}`}>
                  <th className="px-6 py-3 font-normal">Reference</th>
                  <th className="px-6 py-3 font-normal">Photograph</th>
                  <th className="px-6 py-3 font-normal">Contributor</th>
                  <th className="px-6 py-3 text-right font-normal">Amount</th>
                  <th className="px-6 py-3 font-normal">Rights</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f4f4f2] last:border-0">
                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-[#18211f]">
                      {row.reference}
                    </td>
                    <td className="px-6 py-4 text-[#18211f]">{row.photoTitle || "—"}</td>
                    <td className="px-6 py-4 text-[#59645f]">{row.userName || "—"}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-[#18211f]">
                      {money(row.amount)}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#59645f]">
                      {RIGHTS_LABELS[row.rights]}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={row.status}
                        onChange={(e) => move(row, e.target.value as AcquisitionStatus)}
                        aria-label={`Status for ${row.reference}`}
                        className="rounded-lg border border-[#ececec] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#1e4a3f]"
                      >
                        {ACQUISITION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agreements ──────────────────────────────────────────────────────

function AgreementsPanel({
  rows,
  acquisitions,
  photographers,
  onChanged,
}: {
  rows: (Agreement & { userName?: string })[];
  acquisitions: Acquisition[];
  photographers: AdminUser[];
  onChanged: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState<Agreement["kind"]>("contributor");
  const [title, setTitle] = useState("International Contributor Agreement");
  const [version, setVersion] = useState("1.0");
  const [acquisitionId, setAcquisitionId] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    fetchAgreementTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  // Choosing a stored text fills the form rather than replacing it, so it can
  // still be adjusted for one contributor without editing the template.
  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setKind(t.kind);
    setTitle(t.title);
    setVersion(t.version);
    setBody(t.body);
  };

  const forThisKind = templates.filter((t) => t.kind === kind);

  const contributorAcquisitions = acquisitions.filter((a) => a.userId === userId);

  // Warn before issuing, not after: a bracketed blank in a signed contract is
  // not something to discover from the contributor.
  const chosen = photographers.find((p) => p.id === userId);
  const remaining = body
    ? unfilledPlaceholders(body, {
        reference: "NSC-CA-0000-PREVIEW",
        version,
        effectiveDate: new Date().toISOString().slice(0, 10),
        name: chosen?.name,
        contributorId: (chosen as { contributorId?: string } | undefined)?.contributorId,
        email: (chosen as { email?: string } | undefined)?.email,
        country: (chosen as { country?: string } | undefined)?.country,
      })
    : [];

  const submit = async () => {
    if (!userId || !title.trim() || !body.trim()) {
      toast.error("Contributor, title and agreement text are all required");
      return;
    }

    setIsSaving(true);
    const ok = await createAgreement({
      userId,
      kind,
      title: title.trim(),
      body: body.trim(),
      version,
      acquisitionId: acquisitionId || undefined,
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
    setIsSaving(false);

    if (!ok) {
      toast.error("Could not issue the agreement");
      return;
    }

    toast.success("Agreement issued", {
      description: "It is now awaiting the contributor's signature.",
    });
    setBody("");
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="font-serif text-lg text-[#18211f]">Issue an agreement</h3>
        <p className="mt-1 text-sm text-[#6b716d]">
          The text you paste here is stored on the record and is what the contributor signs.
          Revising a template later never rewrites an agreement that has already been signed.
        </p>

        {forThisKind.length > 0 && (
          <label className="mt-5 block">
            <span className={label}>Start from a stored text</span>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className={field}
            >
              <option value="">Write it myself</option>
              {forThisKind.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · v{t.version}
                  {t.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#8a8f89]">
              The placeholders are filled in for the contributor you choose when the agreement is
              issued.
            </span>
          </label>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={label}>Contributor</span>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={field}>
              <option value="">Select contributor</option>
              {photographers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Document</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Agreement["kind"])}
              className={field}
            >
              <option value="contributor">Contributor Agreement</option>
              <option value="acquisition">Acquisition Agreement</option>
              <option value="publication">Publication Agreement</option>
              <option value="marketplace_licence">Marketplace Licence Terms</option>
              <option value="bonus">Bonus Confirmation</option>
            </select>
          </label>

          <label className="block">
            <span className={label}>Version</span>
            <input value={version} onChange={(e) => setVersion(e.target.value)} className={field} />
          </label>

          <label className="block">
            <span className={label}>Linked acquisition</span>
            <select
              value={acquisitionId}
              onChange={(e) => setAcquisitionId(e.target.value)}
              disabled={!userId || contributorAcquisitions.length === 0}
              className={field}
            >
              <option value="">None</option>
              {contributorAcquisitions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.reference} · {money(a.amount)}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2 lg:col-span-4">
            <span className={label}>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
          </label>

          <label className="block sm:col-span-2 lg:col-span-4">
            <span className={label}>
              Agreement text
              {body ? ` · ${body.length.toLocaleString("en-GB")} characters` : ""}
            </span>
            <textarea
              rows={10}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setTemplateId("");
              }}
              placeholder="Paste the full agreement text as reviewed by your solicitor."
              className={`${field} resize-y font-mono text-xs`}
            />
            {remaining.length > 0 && (
              <span className="mt-1 block text-xs text-[#a1701d]">
                Cannot be filled in for this contributor: {remaining.join(", ")}. They will appear
                in the signed document exactly as written.
              </span>
            )}
          </label>
        </div>

        <button onClick={submit} disabled={isSaving} className={`${primary} mt-5`}>
          {isSaving ? "Issuing…" : "Issue agreement"}
        </button>
      </div>

      <div className={`${card} p-0`}>
        <h3 className="px-6 pt-6 font-serif text-lg text-[#18211f]">Issued agreements</h3>
        {rows.length === 0 ? (
          <p className="px-6 pt-2 pb-6 text-sm text-[#6b716d]">Nothing issued yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className={`border-b border-[#ececec] ${label}`}>
                  <th className="px-6 py-3 font-normal">Reference</th>
                  <th className="px-6 py-3 font-normal">Title</th>
                  <th className="px-6 py-3 font-normal">Contributor</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                  <th className="px-6 py-3 font-normal">Signed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f4f4f2] last:border-0">
                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-[#18211f]">
                      {row.reference}
                    </td>
                    <td className="px-6 py-4 text-[#18211f]">{row.title}</td>
                    <td className="px-6 py-4 text-[#59645f]">{row.userName || "—"}</td>
                    <td className="px-6 py-4 text-xs text-[#59645f]">
                      {row.status.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap text-[#59645f]">
                      {row.signedAt
                        ? `${row.signedName} · ${format(new Date(row.signedAt), "d MMM yyyy")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bonuses ─────────────────────────────────────────────────────────

function BonusesPanel({
  photographers,
  adminId,
  onChanged,
}: {
  photographers: AdminUser[];
  adminId?: string;
  onChanged: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [type, setType] = useState<"bonus" | "award">("bonus");
  const [amount, setAmount] = useState("150");
  const [description, setDescription] = useState("Portfolio Acceptance Bonus");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!userId || Number(amount) <= 0) {
      toast.error("Choose a contributor and an amount above zero");
      return;
    }

    setIsSaving(true);
    const ok = await awardBonus({
      userId,
      type,
      amount: Number(amount),
      description: description.trim() || "Contributor award",
      adminId,
    });
    setIsSaving(false);

    if (!ok) {
      toast.error("Could not award the bonus");
      return;
    }

    toast.success(`${money(Number(amount))} awarded`, {
      description: "Credited to the contributor's balance and visible in their earnings.",
    });
    onChanged();
  };

  return (
    <div className={card}>
      <h3 className="font-serif text-lg text-[#18211f]">Award a bonus</h3>
      <p className="mt-1 text-sm text-[#6b716d]">
        This credits the contributor's balance immediately and appears as a line in their earnings.
        There is no separate approval step.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={label}>Contributor</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={field}>
            <option value="">Select contributor</option>
            {photographers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={label}>Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "bonus" | "award")}
            className={field}
          >
            <option value="bonus">Bonus</option>
            <option value="award">Discovery award</option>
          </select>
        </label>

        <label className="block">
          <span className={label}>Amount (£)</span>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={field}
          />
        </label>

        <label className="block">
          <span className={label}>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
          />
        </label>
      </div>

      <button onClick={submit} disabled={isSaving} className={`${primary} mt-5`}>
        {isSaving ? "Awarding…" : "Award bonus"}
      </button>
    </div>
  );
}

// ── Publications ────────────────────────────────────────────────────

function PublicationsPanel({
  rows,
  photographers,
  photosFor,
  onChanged,
}: {
  rows: (PublicationEntry & { userName?: string })[];
  photographers: AdminUser[];
  photosFor: (userId: string) => Photo[];
  onChanged: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [photoId, setPhotoId] = useState("");
  const [collectionName, setCollectionName] = useState("International Hardcover Collection");
  const [edition, setEdition] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const photos = userId ? photosFor(userId) : [];

  const submit = async () => {
    if (!userId || !photoId || !collectionName.trim()) {
      toast.error("Contributor, photograph and collection are all required");
      return;
    }

    setIsSaving(true);
    const ok = await createPublicationEntry({
      userId,
      photoId,
      collectionName: collectionName.trim(),
      edition: edition || undefined,
    });
    setIsSaving(false);

    if (!ok) {
      toast.error("Could not add the publication entry");
      return;
    }

    toast.success("Added to the collection", {
      description: "The contributor can see it under Publications.",
    });
    setPhotoId("");
    onChanged();
  };

  const move = async (id: string, status: PublicationStatus) => {
    const ok = await updatePublicationStatus(id, status);
    if (!ok) {
      toast.error("Could not update the status");
      return;
    }
    toast.success("Publication status updated");
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="font-serif text-lg text-[#18211f]">Consider a photograph for publication</h3>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={label}>Contributor</span>
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPhotoId("");
              }}
              className={field}
            >
              <option value="">Select contributor</option>
              {photographers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Photograph</span>
            <select
              value={photoId}
              onChange={(e) => setPhotoId(e.target.value)}
              disabled={!userId}
              className={field}
            >
              <option value="">
                {userId ? "Select photograph" : "Choose a contributor first"}
              </option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Collection</span>
            <input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Edition</span>
            <input
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              placeholder="e.g. Vol. II"
              className={field}
            />
          </label>
        </div>

        <button onClick={submit} disabled={isSaving} className={`${primary} mt-5`}>
          {isSaving ? "Adding…" : "Add to collection"}
        </button>
      </div>

      <div className={`${card} p-0`}>
        <h3 className="px-6 pt-6 font-serif text-lg text-[#18211f]">Publication entries</h3>
        {rows.length === 0 ? (
          <p className="px-6 pt-2 pb-6 text-sm text-[#6b716d]">Nothing under consideration yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className={`border-b border-[#ececec] ${label}`}>
                  <th className="px-6 py-3 font-normal">Photograph</th>
                  <th className="px-6 py-3 font-normal">Contributor</th>
                  <th className="px-6 py-3 font-normal">Collection</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f4f4f2] last:border-0">
                    <td className="px-6 py-4 text-[#18211f]">{row.photoTitle || "—"}</td>
                    <td className="px-6 py-4 text-[#59645f]">{row.userName || "—"}</td>
                    <td className="px-6 py-4 text-[#59645f]">
                      {row.collectionName}
                      {row.edition && ` · ${row.edition}`}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={row.status}
                        onChange={(e) => move(row.id, e.target.value as PublicationStatus)}
                        aria-label={`Publication status for ${row.photoTitle || row.id}`}
                        className="rounded-lg border border-[#ececec] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#1e4a3f]"
                      >
                        {PUBLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
