import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Copy, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchProposals,
  createProposal,
  cancelProposal,
  proposalLink,
  type ContributorProposal,
  type ProposalStatus,
} from "../../data/db";
import { defaultProposalBody } from "../../data/proposal-template";
import { sendContributorProposal } from "../../../lib/email";
import { COUNTRIES } from "../../../lib/countries";

const label = "font-mono text-[9px] tracking-wider text-[#758078] uppercase";
const field =
  "mt-1.5 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]";
const card = "rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm";

const STATUS_TONE: Record<ProposalStatus, string> = {
  issued: "bg-[#ece9df] text-[#6d746e]",
  viewed: "bg-[#f6ecd8] text-[#7a5a17]",
  accepted: "bg-[#dce8df] text-[#285746]",
  declined: "bg-[#fcf1f3] text-[#8c2f3f]",
  expired: "bg-[#f1f1ef] text-[#8a8f89]",
};

/**
 * Issuing the invitation that starts the programme. The recipient has no
 * account, so this takes an email address rather than a contributor.
 */
export function ProposalsPanel() {
  const { user } = useAuth();

  const [rows, setRows] = useState<ContributorProposal[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [occupation, setOccupation] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    fetchProposals().then(setRows);
  };

  useEffect(load, []);

  // Keep the draft in step with the recipient until the admin edits it.
  const [bodyTouched, setBodyTouched] = useState(false);
  useEffect(() => {
    if (bodyTouched) return;
    setBody(defaultProposalBody({ name, location: country, occupation }));
  }, [name, country, occupation, bodyTouched]);

  const issue = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("A name and an email address are required");
      return;
    }

    setIsSaving(true);
    const created = await createProposal({
      name,
      email,
      location: country || undefined,
      occupation: occupation || undefined,
      body,
      adminId: user?.id,
    });
    setIsSaving(false);

    if (!created) {
      toast.error("Could not create the proposal");
      return;
    }

    const link = proposalLink(created.token);

    await sendContributorProposal(created.email, created.name, created.reference, link).catch(
      (err) => {
        console.error("Proposal email failed:", err);
        toast.error("Proposal created, but the email did not send", {
          description: "Use Copy link to send it yourself.",
        });
      },
    );

    toast.success(`${created.reference} issued`, {
      description: `Sent to ${created.email}.`,
    });

    setName("");
    setEmail("");
    setOccupation("");
    setBodyTouched(false);
    load();
  };

  const copyLink = async (proposal: ContributorProposal) => {
    const link = proposalLink(proposal.token);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied", { description: "Treat it as a credential — it grants access." });
    } catch {
      window.prompt("Copy this invitation link:", link);
    }
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="font-serif text-lg text-[#18211f]">Issue an invitation</h3>
        <p className="mt-1 max-w-2xl text-sm text-[#6b716d]">
          The proposal comes before everything: the photographer reads it without needing an
          account, and accepting it creates their contributor account and opens their agreement. It
          transfers no rights on its own.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={label}>Photographer</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Junghoon Sung"
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Country</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
              <option value="">Not stated</option>
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Occupation</span>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Freelance photographer"
              className={field}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className={label}>Proposal text</span>
          <textarea
            rows={14}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setBodyTouched(true);
            }}
            className={`${field} resize-y font-mono text-xs leading-relaxed`}
          />
          <span className="mt-1 block text-xs text-[#8a8f89]">
            Prefilled from the programme brief. Whatever you send is stored on the proposal, so
            editing this later never changes what someone already accepted.
          </span>
        </label>

        <button
          onClick={issue}
          disabled={isSaving}
          className="mt-5 rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-40"
        >
          {isSaving ? "Issuing…" : "Issue invitation"}
        </button>
      </div>

      <div className={`${card} p-0`}>
        <h3 className="px-6 pt-6 font-serif text-lg text-[#18211f]">Invitations</h3>
        {rows.length === 0 ? (
          <p className="px-6 pt-2 pb-6 text-sm text-[#6b716d]">Nothing issued yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className={`border-b border-[#ececec] ${label}`}>
                  <th className="px-6 py-3 font-normal">Reference</th>
                  <th className="px-6 py-3 font-normal">Photographer</th>
                  <th className="px-6 py-3 font-normal">Issued</th>
                  <th className="px-6 py-3 font-normal">Status</th>
                  <th className="px-6 py-3 text-right font-normal">Link</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f4f4f2] last:border-0">
                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-[#18211f]">
                      {row.reference}
                    </td>
                    <td className="px-6 py-4">
                      <span className="block text-[#18211f]">{row.name}</span>
                      <span className="block text-xs text-[#758078]">{row.email}</span>
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap text-[#59645f]">
                      {format(new Date(row.issuedAt), "d MMM yyyy")}
                      {row.respondedAt && (
                        <span className="block text-[#8a8f89]">
                          Answered {format(new Date(row.respondedAt), "d MMM")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.08em] uppercase ${STATUS_TONE[row.status]}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => copyLink(row)}
                          title="Copy the invitation link"
                          className="flex items-center gap-1.5 rounded-full border border-[#ececec] px-3 py-1.5 text-xs font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
                        >
                          <Copy className="size-3" /> Copy link
                        </button>
                        {(row.status === "issued" || row.status === "viewed") && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Withdraw ${row.reference}?`)) return;
                              const ok = await cancelProposal(row.id);
                              toast[ok ? "success" : "error"](
                                ok ? "Invitation withdrawn" : "Could not withdraw it",
                              );
                              if (ok) load();
                            }}
                            title="Withdraw this invitation"
                            className="grid size-7 place-items-center rounded-full text-[#d4183d] transition hover:bg-[#fcf1f3]"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
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
