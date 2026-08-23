import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../../context/AuthContext";
import {
  fetchAcquisitions,
  getOptimizedImageUrl,
  type Acquisition,
  type AcquisitionStatus,
} from "../../../data/db";
import { Card, EmptyState, FieldGrid, PortalPage, StatusPill, money } from "./shared";
import type { PillTone } from "./shared";

const STATUS_COPY: Record<AcquisitionStatus, { label: string; tone: PillTone; note: string }> = {
  under_consideration: {
    label: "Under Consideration",
    tone: "progress",
    note: "NS CAPTURES is considering this photograph for direct acquisition.",
  },
  offer_made: {
    label: "Offer Made",
    tone: "attention",
    note: "An acquisition offer has been made for this photograph.",
  },
  awaiting_contributor: {
    label: "Awaiting You",
    tone: "attention",
    note: "This offer is waiting on your response.",
  },
  agreement_pending: {
    label: "Agreement Pending",
    tone: "attention",
    note: "The acquisition agreement is ready for your review and signature.",
  },
  agreement_signed: {
    label: "Agreement Signed",
    tone: "good",
    note: "The agreement has been signed and recorded.",
  },
  payment_pending: {
    label: "Payment Pending",
    tone: "progress",
    note: "Payment for this acquisition is being processed.",
  },
  paid: { label: "Paid", tone: "good", note: "This acquisition has been paid." },
  declined: { label: "Declined", tone: "closed", note: "This offer was declined." },
  cancelled: { label: "Cancelled", tone: "closed", note: "This offer was withdrawn." },
};

const CATEGORY_LABELS = {
  standard: "Standard Selection",
  premium: "Premium Selection",
  signature: "Signature Selection",
  exceptional: "Exceptional / Collection Selection",
} as const;

const RIGHTS_LABELS = {
  non_exclusive: "Non-exclusive licence",
  exclusive: "Exclusive licence",
  assignment: "Copyright assignment",
} as const;

/** Statuses where the contributor is the one holding things up. */
const NEEDS_YOU: AcquisitionStatus[] = ["offer_made", "awaiting_contributor", "agreement_pending"];

export function AcquisitionsTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Acquisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchAcquisitions(user.id).then((data) => {
      if (cancelled) return;
      setRows(data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const awaiting = rows.filter((r) => NEEDS_YOU.includes(r.status));
  const totalPaid = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);

  return (
    <PortalPage
      eyebrow="DIRECT ACQUISITIONS"
      title="Direct Acquisitions"
      intro="NS CAPTURES may identify selected photographs for direct acquisition based on photographic quality, originality, rarity, editorial value, commercial potential or collection requirements. An acquisition is always a separate agreement on a named photograph — uploading, approval or publication never transfers rights on its own."
      aside={
        rows.length > 0 ? (
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
              Acquired to date
            </p>
            <p className="mt-1 font-serif text-2xl text-[#18211f]">{money(totalPaid)}</p>
          </div>
        ) : null
      }
    >
      {awaiting.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#1e4a3f]/25 bg-[#f2f7f4] p-5">
          <p className="font-mono text-[9px] tracking-[0.12em] text-[#1e4a3f] uppercase">
            Requires your attention
          </p>
          <p className="mt-1.5 text-sm text-[#18211f]">
            {awaiting.length === 1
              ? "One acquisition is waiting on you."
              : `${awaiting.length} acquisitions are waiting on you.`}
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-[#758078]">Loading your acquisitions…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No acquisitions yet."
          body="If NS CAPTURES selects one of your photographs for direct acquisition, the offer and its terms will appear here."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const copy = STATUS_COPY[row.status];
            const isOpen = openId === row.id;

            return (
              <Card key={row.id}>
                <div className="flex flex-wrap items-start gap-5">
                  {row.photoImage && (
                    <img
                      src={getOptimizedImageUrl(row.photoImage, 160)}
                      alt=""
                      loading="lazy"
                      className="size-20 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-lg text-[#18211f]">
                        {row.photoTitle || "Untitled photograph"}
                      </h3>
                      <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-[#59645f]">{copy.note}</p>
                    <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-[#758078] uppercase">
                      {CATEGORY_LABELS[row.category]} · {row.reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl text-[#18211f]">
                      {money(row.amount, row.currency)}
                    </p>
                    <button
                      onClick={() => setOpenId(isOpen ? null : row.id)}
                      aria-expanded={isOpen}
                      className="mt-2 rounded-full border border-[#ececec] px-4 py-1.5 text-xs font-semibold text-[#1e4a3f] transition hover:border-[#1e4a3f]"
                    >
                      {isOpen ? "Hide details" : "View acquisition"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-6 border-t border-[#ececec] pt-6">
                    <FieldGrid
                      fields={[
                        { label: "Acquisition amount", value: money(row.amount, row.currency) },
                        { label: "Category", value: CATEGORY_LABELS[row.category] },
                        { label: "Rights arrangement", value: RIGHTS_LABELS[row.rights] },
                        { label: "Territory", value: row.territory || "—" },
                        { label: "Term", value: row.term || "—" },
                        { label: "Attribution", value: row.attribution || "—" },
                        {
                          label: "Offer date",
                          value: row.offeredAt
                            ? format(new Date(row.offeredAt), "d MMMM yyyy")
                            : "—",
                        },
                        {
                          label: "Paid",
                          value: row.paidAt ? format(new Date(row.paidAt), "d MMMM yyyy") : "—",
                        },
                        { label: "Reference", value: row.reference },
                      ]}
                    />

                    {row.permittedUses && (
                      <div className="mt-5">
                        <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                          Permitted uses
                        </p>
                        <p className="mt-1 text-sm text-[#18211f]">{row.permittedUses}</p>
                      </div>
                    )}

                    {row.selectionNote && (
                      <div className="mt-5 rounded-xl bg-[#FAF9F5] p-4">
                        <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                          Why this photograph was selected
                        </p>
                        <p className="mt-1 text-sm text-[#18211f]">{row.selectionNote}</p>
                      </div>
                    )}

                    <p className="mt-5 text-xs text-[#758078]">
                      This offer relates only to the photograph named above and does not transfer
                      rights in any of your other work.
                    </p>
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
