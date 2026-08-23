import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "../../../context/AuthContext";
import {
  fetchAgreements,
  signAgreement,
  type Agreement,
  type AgreementStatus,
} from "../../../data/db";
import { Card, EmptyState, PortalPage, StatusPill } from "./shared";
import { printAgreement } from "./printAgreement";
import type { PillTone } from "./shared";

const STATUS_COPY: Record<AgreementStatus, { label: string; tone: PillTone }> = {
  awaiting_signature: { label: "Awaiting Your Signature", tone: "attention" },
  signed: { label: "Signed", tone: "good" },
  active: { label: "Active", tone: "good" },
  declined: { label: "Declined", tone: "closed" },
  terminated: { label: "Terminated", tone: "closed" },
};

const KIND_LABELS = {
  contributor: "Contributor Agreement",
  acquisition: "Photograph Acquisition Agreement",
  publication: "Publication & Collection Agreement",
  marketplace_licence: "Marketplace Licence Terms",
  bonus: "Bonus & Award Confirmation",
} as const;

export function AgreementsTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchAgreements(user.id).then((data) => {
      if (cancelled) return;
      setRows(data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const openAgreement = (id: string) => {
    setOpenId(id);
    setTypedName("");
    setAccepted(false);
  };

  const handleSign = async (agreement: Agreement) => {
    setIsSigning(true);
    const ok = await signAgreement(agreement.id, typedName.trim());
    setIsSigning(false);

    if (!ok) {
      toast.error("Could not record your signature", {
        description: "Reload the page and try again. Nothing has been signed.",
      });
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === agreement.id
          ? {
              ...r,
              status: "signed",
              signedName: typedName.trim(),
              signedAt: new Date().toISOString(),
            }
          : r,
      ),
    );
    setOpenId(null);
    toast.success("Agreement signed", {
      description: "Your agreement has been signed and securely recorded.",
    });
  };

  const awaiting = rows.filter((r) => r.status === "awaiting_signature");

  return (
    <PortalPage
      eyebrow="AGREEMENTS"
      title="My Agreements"
      intro="Your contributor relationship is governed by separate agreements rather than one blanket contract: a general contributor agreement, and an individual agreement for each acquisition or publication. Signed copies are kept exactly as they were agreed."
    >
      {awaiting.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#1e4a3f]/25 bg-[#f2f7f4] p-5">
          <p className="font-mono text-[9px] tracking-[0.12em] text-[#1e4a3f] uppercase">
            Requires your attention
          </p>
          <p className="mt-1.5 text-sm text-[#18211f]">
            {awaiting.length === 1
              ? "One agreement is waiting for your signature."
              : `${awaiting.length} agreements are waiting for your signature.`}
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-[#758078]">Loading your agreements…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No agreements yet."
          body="Your contributor agreement will appear here, along with an individual agreement for each acquisition or publication."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const copy = STATUS_COPY[row.status];
            const isOpen = openId === row.id;
            const canSign = row.status === "awaiting_signature";

            return (
              <Card key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-lg text-[#18211f]">
                        {row.title || KIND_LABELS[row.kind]}
                      </h3>
                      <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] text-[#758078] uppercase">
                      {row.reference} · Version {row.version}
                      {user?.contributorId && ` · ${user.contributorId}`}
                      {row.effectiveDate &&
                        ` · Effective ${format(new Date(row.effectiveDate), "d MMM yyyy")}`}
                    </p>
                    {row.signedAt && (
                      <p className="mt-1 text-xs text-[#59645f]">
                        Signed by {row.signedName} on{" "}
                        {format(new Date(row.signedAt), "d MMMM yyyy, HH:mm")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {row.status !== "awaiting_signature" && (
                      <button
                        onClick={() => printAgreement(row, user?.contributorId, user?.name)}
                        className="rounded-full border border-[#ececec] px-4 py-1.5 text-xs font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
                      >
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => (isOpen ? setOpenId(null) : openAgreement(row.id))}
                      aria-expanded={isOpen}
                      className="rounded-full border border-[#ececec] px-4 py-1.5 text-xs font-semibold text-[#1e4a3f] transition hover:border-[#1e4a3f]"
                    >
                      {isOpen ? "Close" : canSign ? "Review agreement" : "View agreement"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-6 border-t border-[#ececec] pt-6">
                    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[#ececec] bg-[#FAF9F5] p-6">
                      {row.body ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-[#18211f]">
                          {row.body}
                        </div>
                      ) : (
                        <p className="text-sm text-[#758078]">
                          The text of this agreement has not been attached to the record.
                        </p>
                      )}
                    </div>

                    {canSign && (
                      <div className="mt-6">
                        <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                          Contributor acceptance
                        </p>
                        <label className="mt-3 flex items-start gap-3 text-sm text-[#18211f]">
                          <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 size-4 accent-[#1e4a3f]"
                          />
                          <span>
                            I confirm that I have read and understood this Agreement and agree to be
                            legally bound by its terms.
                          </span>
                        </label>

                        <label className="mt-4 block max-w-sm">
                          <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                            Type your full name to sign
                          </span>
                          <input
                            type="text"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder={user?.name || "Your full name"}
                            className="mt-2 w-full rounded-xl border border-[#ececec] bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4a3f]"
                          />
                        </label>

                        <button
                          onClick={() => handleSign(row)}
                          disabled={!accepted || typedName.trim().length < 2 || isSigning}
                          className="mt-4 rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSigning ? "Signing…" : "Sign agreement"}
                        </button>

                        <p className="mt-3 max-w-md text-xs text-[#758078]">
                          Signing records your name, the exact version of this agreement and the
                          date and time of acceptance.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PortalPage>
  );
}
