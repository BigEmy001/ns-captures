import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import {
  fetchAcquisitions,
  respondToAcquisition,
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

/** The two states in which an offer is actually open to an answer. */
const CAN_ANSWER: AcquisitionStatus[] = ["offer_made", "awaiting_contributor"];

export function AcquisitionsTab() {
  const { user } = useAuth();
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
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

  const answer = async (row: Acquisition, accept: boolean) => {
    setIsSending(true);
    const ok = await respondToAcquisition(row.id, accept, note);
    setIsSending(false);

    if (!ok) {
      toast.error("Could not record your answer", {
        description: "Reload the page and try again. Nothing has changed.",
      });
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: accept ? "agreement_pending" : "declined",
              responseNote: note.trim() || null,
              respondedAt: new Date().toISOString(),
            }
          : r,
      ),
    );
    setAnsweringId(null);
    setDecliningId(null);
    setNote("");
    toast.success(accept ? "Offer accepted" : "Offer declined", {
      description: accept
        ? "We will prepare the acquisition agreement for your signature."
        : "We have recorded your decision and will be in touch.",
    });
  };

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
                      {user?.contributorId && ` · ${user.contributorId}`}
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
                        { label: "Contributor ID", value: user?.contributorId || "—" },
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

                    {row.responseNote && (
                      <p className="mt-3 text-xs text-[#59645f]">Your note: “{row.responseNote}”</p>
                    )}

                    {/* An offer put to someone should be answerable by them.
                        Accepting only agrees in principle — the agreement that
                        follows is what actually binds either side. */}
                    {CAN_ANSWER.includes(row.status) && (
                      <div className="mt-6 border-t border-[#ececec] pt-5">
                        <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                          Your answer
                        </p>

                        {decliningId === row.id ? (
                          <div className="mt-3 max-w-md rounded-xl border border-[#e8d5d2] bg-[#fdf7f6] p-4">
                            <p className="text-sm font-semibold text-[#7a2f27]">
                              Decline this offer?
                            </p>
                            <p className="mt-1 text-xs text-[#7a2f27]">
                              Nothing changes elsewhere on your account, and the photograph stays
                              yours and stays listed.
                            </p>
                            <label className="mt-3 block">
                              <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                                Reason (optional)
                              </span>
                              <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                placeholder="Anything you would like us to know"
                                className="mt-2 w-full resize-y rounded-xl border border-[#ececec] bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4a3f]"
                              />
                            </label>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <button
                                onClick={() => answer(row, false)}
                                disabled={isSending}
                                className="rounded-full bg-[#b4453c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#993a32] disabled:cursor-not-allowed disabled:opacity-40 sm:py-2.5"
                              >
                                {isSending ? "Recording…" : "Yes, decline"}
                              </button>
                              <button
                                onClick={() => setDecliningId(null)}
                                className="rounded-full border border-[#ececec] bg-white px-5 py-3 text-sm font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f] sm:py-2.5"
                              >
                                Keep considering
                              </button>
                            </div>
                          </div>
                        ) : answeringId === row.id ? (
                          <div className="mt-3 max-w-md rounded-xl border border-[#1e4a3f]/25 bg-[#f2f7f4] p-4">
                            <p className="text-sm font-semibold text-[#18211f]">
                              Accept this offer?
                            </p>
                            <p className="mt-1 text-xs text-[#4a534e]">
                              This agrees to the terms above in principle. We will then prepare the
                              acquisition agreement — nothing is transferred until you have signed
                              it.
                            </p>
                            <label className="mt-3 block">
                              <span className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                                Note (optional)
                              </span>
                              <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                placeholder="Anything you would like us to know"
                                className="mt-2 w-full resize-y rounded-xl border border-[#ececec] bg-white px-4 py-3 text-sm outline-none focus:border-[#1e4a3f]"
                              />
                            </label>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <button
                                onClick={() => answer(row, true)}
                                disabled={isSending}
                                className="rounded-full bg-[#1e4a3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40 sm:py-2.5"
                              >
                                {isSending ? "Recording…" : "Yes, accept"}
                              </button>
                              <button
                                onClick={() => setAnsweringId(null)}
                                className="rounded-full border border-[#ececec] bg-white px-5 py-3 text-sm font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f] sm:py-2.5"
                              >
                                Not yet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => {
                                setAnsweringId(row.id);
                                setNote("");
                              }}
                              className="rounded-full bg-[#1e4a3f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] sm:py-2.5"
                            >
                              Accept offer
                            </button>
                            <button
                              onClick={() => {
                                setDecliningId(row.id);
                                setNote("");
                              }}
                              className="rounded-full border border-[#ececec] px-5 py-3 text-sm font-semibold text-[#4a534e] transition hover:border-[#b4453c] hover:text-[#b4453c] sm:py-2.5"
                            >
                              Decline
                            </button>
                          </div>
                        )}
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
