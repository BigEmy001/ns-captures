import { Eyebrow, Button } from "../components/ui";
import { Link } from "react-router";
import { LICENSE_TIERS, type LicenseTier } from "../data/licensing";

// Starting Commercial rate across the archive catalog
const BASE_COMMERCIAL_RATE = 180;

// Order from lowest tier to exclusive sole rights
const TIER_ORDER: LicenseTier[] = ["EDITORIAL", "COMMERCIAL", "EXTENDED", "EXCLUSIVE"];

const licenseRows = TIER_ORDER.map((tierId) => {
  const tier = LICENSE_TIERS.find((t) => t.id === tierId)!;
  return {
    license: tier.label,
    usage: tier.usage,
    from: Math.round(BASE_COMMERCIAL_RATE * tier.multiplier),
    details: `Duration: ${tier.duration} · Coverage: ${tier.coverage}. Restrictions: ${tier.restrictions}`,
  };
});

export function Pricing() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="text-center">
        <Eyebrow>LICENSING RATES</Eyebrow>
        <h1 className="mx-auto mt-3 max-w-2xl font-serif text-4xl leading-[1.03] sm:text-6xl">
          Straightforward pricing. Simple rights.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[#59645f]">
          License single images à la carte. No recurring subscription lock-ins, complex tokens, or
          confusing legal terms.
        </p>
      </div>

      {/* Per-image licensing */}
      <section className="mt-16">
        <div className="overflow-x-auto border border-[#ececec] ns-shadow-sm rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.1em] text-[#8a8f89]">
              <tr>
                <th className="px-6 py-4">LICENSE</th>
                <th className="px-6 py-4">TYPICAL USAGE</th>
                <th className="px-6 py-4 text-right">FROM</th>
              </tr>
            </thead>
            <tbody className="bg-[#ffffff]">
              {licenseRows.map((r) => (
                <tr key={r.license} className="border-t border-[#ececec]">
                  <td className="px-6 py-5">
                    <span className="font-semibold text-lg text-[#18211f]">{r.license}</span>
                    <p className="mt-1.5 text-xs text-[#8a8f89] max-w-md leading-relaxed font-normal">
                      {r.details}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-[#6b716d] text-sm">{r.usage}</td>
                  <td className="px-6 py-5 text-right font-serif text-2xl text-[#1e4a3f] font-semibold">
                    £{r.from}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-16 flex flex-col items-center justify-between gap-6 border border-[#ececec] bg-[#fafafa] p-8 sm:flex-row rounded-2xl shadow-sm">
        <div>
          <h3 className="font-serif text-2xl">Can't find the image you need?</h3>
          <p className="mt-1 text-sm text-[#59645f]">
            Commission it with a curated request from £200.
          </p>
        </div>
        <Link to="/contribute">
          <Button>Request a shoot</Button>
        </Link>
      </div>
    </div>
  );
}
