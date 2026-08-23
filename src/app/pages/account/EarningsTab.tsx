import { useEffect, useMemo, useState } from "react";
import { format, isAfter, subMonths, startOfMonth, startOfYear } from "date-fns";
import { Badge, Eyebrow } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import {
  fetchContributorEarnings,
  summariseEarnings,
  type ContributorEarning,
  type EarningStatus,
  type EarningType,
} from "../../data/db";

const TYPE_LABELS: Record<EarningType, string> = {
  licensing: "Marketplace Licensing",
  acquisition: "Direct Acquisitions",
  bonus: "Performance Bonuses",
  award: "Discovery Awards",
  adjustment: "Adjustments",
};

const STATUS_LABELS: Record<EarningStatus, string> = {
  pending: "Pending",
  available: "Available",
  paid: "Paid",
  cancelled: "Cancelled",
};

const PERIODS = [
  { id: "all", label: "All time" },
  { id: "month", label: "This month" },
  { id: "quarter", label: "Last 3 months" },
  { id: "year", label: "This year" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

function money(amount: number): string {
  return `£${Math.round(amount).toLocaleString()}`;
}

function periodStart(period: PeriodId): Date | null {
  const now = new Date();
  if (period === "month") return startOfMonth(now);
  if (period === "quarter") return subMonths(now, 3);
  if (period === "year") return startOfYear(now);
  return null;
}

export function EarningsTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ContributorEarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<EarningType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<EarningStatus | "all">("all");
  const [period, setPeriod] = useState<PeriodId>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchContributorEarnings(user.id).then((rows) => {
      if (cancelled) return;
      setEntries(rows);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // The summary always reflects the whole ledger — filters narrow the history
  // table below, not the headline balances.
  const summary = useMemo(() => summariseEarnings(entries), [entries]);

  const filtered = useMemo(() => {
    const since = periodStart(period);
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (since && !isAfter(new Date(entry.createdAt), since)) return false;
      if (query) {
        const haystack = `${entry.description || ""} ${entry.photoTitle || ""} ${entry.reference || ""}`;
        if (!haystack.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [entries, typeFilter, statusFilter, period, search]);

  const breakdown = (["licensing", "acquisition", "bonus", "award", "adjustment"] as EarningType[])
    .map((type) => ({ type, amount: summary.byType[type] }))
    .filter((row) => row.type !== "adjustment" || row.amount !== 0);

  return (
    <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>CONTRIBUTOR EARNINGS</Eyebrow>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">
              Earnings
            </h1>
          </div>
          {user?.contributorId && (
            <div className="text-right">
              <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                Contributor ID
              </p>
              <p className="mt-1 font-mono text-sm text-[#18211f]">{user.contributorId}</p>
            </div>
          )}
        </div>

        {/* Headline balances */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Available", value: summary.available, hint: "Ready to withdraw" },
            { label: "Pending", value: summary.pending, hint: "Clears once a sale is approved" },
            { label: "Lifetime", value: summary.lifetime, hint: "Earned since joining" },
          ].map((card) => (
            <div
              key={card.label}
              className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm"
            >
              <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                {card.label}
              </p>
              <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">
                {money(card.value)}
              </p>
              <p className="mt-1 text-xs text-[#758078]">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* Breakdown by earning type */}
        <div className="mt-6 border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
          <h3 className="font-serif text-lg text-[#18211f]">Earnings Breakdown</h3>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {breakdown.map((row) => (
              <div key={row.type}>
                <p className="font-mono text-[9px] tracking-[0.1em] text-[#758078] uppercase">
                  {TYPE_LABELS[row.type]}
                </p>
                <p className="mt-1 font-serif text-2xl text-[#18211f]">{money(row.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="mt-6 border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ececec] p-6">
            <h3 className="font-serif text-lg text-[#18211f]">Earnings History</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search photograph or reference"
                aria-label="Search earnings"
                className="w-56 rounded-lg border border-[#ececec] px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as EarningType | "all")}
                aria-label="Filter by transaction type"
                className="rounded-lg border border-[#ececec] px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              >
                <option value="all">All types</option>
                {(Object.keys(TYPE_LABELS) as EarningType[]).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EarningStatus | "all")}
                aria-label="Filter by status"
                className="rounded-lg border border-[#ececec] px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="available">Available</option>
                <option value="paid">Paid</option>
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodId)}
                aria-label="Filter by period"
                className="rounded-lg border border-[#ececec] px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-[#758078]">Loading your earnings…</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-serif text-lg text-[#18211f]">
                {entries.length === 0 ? "No earnings yet." : "Nothing matches those filters."}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#758078]">
                {entries.length === 0
                  ? "Once one of your photographs is licensed or acquired, every payment will be itemised here."
                  : "Try widening the period or clearing the search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ececec] font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                    <th className="px-6 py-3 font-normal">Date</th>
                    <th className="px-6 py-3 font-normal">Type</th>
                    <th className="px-6 py-3 font-normal">Description</th>
                    <th className="px-6 py-3 text-right font-normal">Amount</th>
                    <th className="px-6 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-[#f4f4f2] last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap text-[#59645f]">
                        {format(new Date(entry.createdAt), "d MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#18211f]">
                        {TYPE_LABELS[entry.type]}
                      </td>
                      <td className="px-6 py-4 text-[#59645f]">
                        {entry.photoTitle || entry.description || entry.reference || "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium whitespace-nowrap text-[#18211f]">
                        {money(entry.netAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          tone={
                            entry.status === "paid"
                              ? "green"
                              : entry.status === "available"
                                ? "green"
                                : "muted"
                          }
                        >
                          {STATUS_LABELS[entry.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
