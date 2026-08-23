import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { fetchLicensedWork, getOptimizedImageUrl, type LicensedWork } from "../../../data/db";
import { Card, EmptyState, PortalPage, money } from "./shared";

export function LicensedWorkTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LicensedWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.slug) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    fetchLicensedWork(user.slug).then((data) => {
      if (cancelled) return;
      setRows(data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.slug]);

  const totalLicences = rows.reduce((sum, r) => sum + r.licenceCount, 0);
  const totalGross = rows.reduce((sum, r) => sum + r.grossValue, 0);

  return (
    <PortalPage
      eyebrow="LICENSED PHOTOS"
      title="Licensed Work"
      intro="Photographs of yours that customers have licensed through the NS CAPTURES marketplace. Gross value is what the customer paid; your share of each licence is itemised under Earnings."
      aside={
        rows.length > 0 ? (
          <div className="flex gap-8 text-right">
            <div>
              <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                Licences
              </p>
              <p className="mt-1 font-serif text-2xl text-[#18211f]">{totalLicences}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                Gross value
              </p>
              <p className="mt-1 font-serif text-2xl text-[#18211f]">{money(totalGross)}</p>
            </div>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <p className="text-sm text-[#758078]">Loading your licensed work…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing licensed yet."
          body="When a customer licenses one of your photographs, it will appear here with the number of licences and what they were worth."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#ececec] font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                <th className="px-6 py-3 font-normal">Photograph</th>
                <th className="px-6 py-3 text-right font-normal">Licences</th>
                <th className="px-6 py-3 text-right font-normal">Gross value</th>
                <th className="px-6 py-3 font-normal">Last licensed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.photoId} className="border-b border-[#f4f4f2] last:border-0">
                  <td className="px-6 py-4">
                    <Link to={`/photo/${row.photoId}`} className="flex items-center gap-3">
                      {row.image && (
                        <img
                          src={getOptimizedImageUrl(row.image, 96)}
                          alt=""
                          loading="lazy"
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <span className="font-medium text-[#18211f] hover:underline">
                        {row.title}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-[#18211f]">
                    {row.licenceCount}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-[#18211f]">
                    {money(row.grossValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[#59645f]">
                    {row.lastLicensedAt ? format(new Date(row.lastLicensedAt), "d MMM yyyy") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PortalPage>
  );
}
