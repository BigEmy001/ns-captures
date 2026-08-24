import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import {
  fetchContributorEarnings,
  fetchPublicationEntries,
  fetchCollectionsFeaturing,
  getOptimizedImageUrl,
  type ContributorEarning,
  type PublicationEntry,
  type PublicationStatus,
} from "../../../data/db";
import { Card, EmptyState, PortalPage, StatusPill, money } from "./shared";
import type { PillTone } from "./shared";
import { ledgerLabel } from "../../../../lib/ledger";

// ── Bonuses & Awards ────────────────────────────────────────────────

/** The three award types described in the programme brief. */
const AWARD_TYPES = [
  {
    name: "Portfolio Acceptance Bonus",
    body: "Contributors whose submissions demonstrate an exceptional level of quality may qualify for an additional portfolio acceptance bonus.",
  },
  {
    name: "Exploration & Discovery Award",
    body: "Exceptional photographs may qualify for additional recognition based on originality, rarity, cultural significance, distinctive perspective or collection value.",
  },
  {
    name: "Performance & Collection Bonus",
    body: "Selected photographs may qualify for additional compensation based on exceptional commercial, editorial or collection performance.",
  },
];

export function BonusesTab() {
  const { user } = useAuth();
  const [awards, setAwards] = useState<ContributorEarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchContributorEarnings(user.id).then((rows) => {
      if (cancelled) return;
      setAwards(rows.filter((r) => r.type === "bonus" || r.type === "award"));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const total = awards.reduce((sum, a) => sum + a.netAmount, 0);

  return (
    <PortalPage
      eyebrow="BONUSES & AWARDS"
      title="Bonuses & Awards"
      intro="Beyond marketplace licensing and direct acquisition, NS CAPTURES may recognise contributors with discretionary bonuses and awards. These are always confirmed in writing, and any amount awarded appears in your earnings."
      aside={
        awards.length > 0 ? (
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
              Awarded to date
            </p>
            <p className="mt-1 font-serif text-2xl text-[#18211f]">{money(total)}</p>
          </div>
        ) : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {AWARD_TYPES.map((award) => (
          <Card key={award.name}>
            <h3 className="font-serif text-lg text-[#18211f]">{award.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#59645f]">{award.body}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 mb-4 font-serif text-xl text-[#18211f]">Your awards</h2>

      {isLoading ? (
        <p className="text-sm text-[#758078]">Loading…</p>
      ) : awards.length === 0 ? (
        <EmptyState
          title="No bonuses or awards yet."
          body="Awards are discretionary. If your work qualifies, the confirmation and the amount will appear here and in your earnings."
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-[#f2f2f0]">
            {awards.map((award) => (
              <li key={award.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#18211f]">
                    {ledgerLabel(award.description) ||
                      (award.type === "award" ? "Discovery award" : "Bonus")}
                  </p>
                  {award.photoTitle && (
                    <p className="mt-0.5 text-sm text-[#758078]">{award.photoTitle}</p>
                  )}
                </div>
                <p className="font-serif text-lg text-[#18211f]">{money(award.netAmount)}</p>
                <StatusPill tone={award.status === "paid" ? "good" : "progress"}>
                  {award.status === "paid" ? "Paid" : "Pending"}
                </StatusPill>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PortalPage>
  );
}

// ── Publications ────────────────────────────────────────────────────

const PUBLICATION_COPY: Record<PublicationStatus, { label: string; tone: PillTone }> = {
  under_consideration: { label: "Under Consideration", tone: "progress" },
  shortlisted: { label: "Shortlisted", tone: "attention" },
  selected: { label: "Selected", tone: "good" },
  published: { label: "Published", tone: "good" },
  not_selected: { label: "Not Selected", tone: "closed" },
};

export function PublicationsTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PublicationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchPublicationEntries(user.id).then((rows) => {
      if (cancelled) return;
      setEntries(rows);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const shortlisted = entries.filter(
    (e) => e.status === "shortlisted" || e.status === "selected" || e.status === "published",
  ).length;

  return (
    <PortalPage
      eyebrow="PUBLICATIONS"
      title="International Hardcover Collection"
      intro="Selected NS CAPTURES contributors may be considered for inclusion in curated international photography publications. Selection is editorial and is not guaranteed by becoming a contributor."
      aside={
        entries.length > 0 ? (
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
              Your publication status
            </p>
            <p className="mt-1 font-serif text-2xl text-[#18211f]">
              {shortlisted} photograph{shortlisted === 1 ? "" : "s"} shortlisted
            </p>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <p className="text-sm text-[#758078]">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No publication activity yet."
          body="If one of your photographs is considered for a curated collection, its status will be tracked here."
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const copy = PUBLICATION_COPY[entry.status];
            return (
              <Card key={entry.id} className="flex flex-wrap items-center gap-5">
                {entry.photoImage && (
                  <img
                    src={getOptimizedImageUrl(entry.photoImage, 120)}
                    alt=""
                    loading="lazy"
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg text-[#18211f]">
                    {entry.photoTitle || "Untitled photograph"}
                  </h3>
                  <p className="mt-0.5 text-sm text-[#59645f]">
                    {entry.collectionName}
                    {entry.edition && ` · ${entry.edition}`}
                  </p>
                  {entry.note && <p className="mt-1 text-xs text-[#758078]">{entry.note}</p>}
                </div>
                <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
              </Card>
            );
          })}
        </div>
      )}
    </PortalPage>
  );
}

// ── Collections featuring your work ─────────────────────────────────

export function FeaturedInTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<{ id: string; title: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.slug) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    fetchCollectionsFeaturing(user.slug).then((data) => {
      if (cancelled) return;
      setRows(data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.slug]);

  return (
    <PortalPage
      eyebrow="COLLECTIONS"
      title="Featured In"
      intro="Curated NS CAPTURES collections that include your photographs. Collections are assembled editorially and give your work additional visibility on the marketplace."
    >
      {isLoading ? (
        <p className="text-sm text-[#758078]">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Not in a collection yet."
          body="When one of your photographs is added to a curated collection, it will be listed here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <h3 className="font-serif text-lg text-[#18211f]">{row.title}</h3>
              <p className="mt-1 text-sm text-[#758078]">
                {row.count} of your photograph{row.count === 1 ? "" : "s"}
              </p>
              <Link
                to={`/collections`}
                className="mt-4 inline-block text-xs font-semibold text-[#1e4a3f] underline underline-offset-4"
              >
                View collection
              </Link>
            </Card>
          ))}
        </div>
      )}
    </PortalPage>
  );
}
