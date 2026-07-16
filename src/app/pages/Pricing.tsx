import { useState } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import { Eyebrow, Button } from "../components/ui";
import { useRequest } from "../components/RequestModal";

const plans = [
  {
    name: "Individual",
    monthly: 19,
    yearly: 15,
    tagline: "For creators & freelancers.",
    features: ["25 downloads / month", "Standard commercial license", "Access to full library", "Save to collections"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Studio",
    monthly: 59,
    yearly: 49,
    tagline: "For teams building brands.",
    features: ["Unlimited downloads", "Extended commercial license", "3 team seats", "Shared brand libraries", "Priority curated requests"],
    cta: "Choose Studio",
    featured: true,
  },
  {
    name: "Enterprise",
    monthly: null,
    yearly: null,
    tagline: "For agencies & publishers.",
    features: ["Everything in Studio", "Custom licensing & contracts", "SSO & usage tracking", "Dedicated art buyer", "Volume & exclusive rights"],
    cta: "Talk to sales",
    featured: false,
  },
];

const licenseRows = [
  { license: "Editorial", usage: "News, education, non-commercial", from: 130 },
  { license: "Commercial", usage: "Ads, web & social for business", from: 180 },
  { license: "Extended", usage: "Merchandise & resale products", from: 450 },
  { license: "Exclusive", usage: "Sole rights, removed from library", from: 1200 },
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  const openRequest = useRequest();

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
      <div className="text-center">
        <Eyebrow>PRICING</Eyebrow>
        <h1 className="mx-auto mt-3 max-w-2xl font-serif text-4xl leading-[1.03] sm:text-6xl">
          Simple plans. Honest licenses.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[#59645f]">
          Subscribe for volume, or license single images à la carte. No confusing rights, ever.
        </p>

        <div className="mt-8 inline-flex items-center gap-1 border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-1">
          <button onClick={() => setYearly(false)} className={`px-4 py-2 text-sm transition ${!yearly ? "bg-[#1e4a3f] text-white ns-shadow-sm" : "text-[#4a534e]"}`}>Monthly</button>
          <button onClick={() => setYearly(true)} className={`px-4 py-2 text-sm transition ${yearly ? "bg-[#1e4a3f] text-white ns-shadow-sm" : "text-[#4a534e]"}`}>Yearly · save 20%</button>
        </div>
      </div>

      {/* Plans */}
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col border p-8 ${p.featured ? "border-[#1e4a3f] bg-[#1e4a3f] text-white" : "border-[#ececec] bg-[#ffffff]"}`}
          >
            <h2 className="font-serif text-2xl">{p.name}</h2>
            <p className={`mt-1 text-sm ${p.featured ? "text-white/70" : "text-[#6b716d]"}`}>{p.tagline}</p>
            <div className="mt-6">
              {p.monthly === null ? (
                <span className="font-serif text-4xl">Custom</span>
              ) : (
                <>
                  <span className="font-serif text-5xl">${yearly ? p.yearly : p.monthly}</span>
                  <span className={`text-sm ${p.featured ? "text-white/70" : "text-[#6b716d]"}`}>/mo</span>
                </>
              )}
            </div>
            <ul className="mt-8 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className={`mt-0.5 size-4 shrink-0 ${p.featured ? "text-[#d7e3bd]" : "text-[#1e4a3f]"}`} />
                  <span className={p.featured ? "text-white/90" : "text-[#4a534e]"}>{f}</span>
                </li>
              ))}
            </ul>
            {p.name === "Enterprise" ? (
              <Link to="/enterprise" className="mt-8">
                <button className={`w-full py-3 text-sm font-semibold ${p.featured ? "bg-white text-[#1e4a3f]" : "border border-[#1e4a3f] text-[#1e4a3f]"}`}>{p.cta}</button>
              </Link>
            ) : (
              <Link to="/signup" className="mt-8">
                <button className={`w-full py-3 text-sm font-semibold ${p.featured ? "bg-white text-[#1e4a3f]" : "bg-[#1e4a3f] text-white"}`}>{p.cta}</button>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Per-image licensing */}
      <section className="mt-20">
        <Eyebrow>OR LICENSE SINGLE IMAGES</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Per-image licensing</h2>
        <div className="mt-8 overflow-hidden border border-[#ececec] ns-shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-[0.1em] text-[#8a8f89]">
              <tr>
                <th className="px-5 py-3">LICENSE</th>
                <th className="px-5 py-3">TYPICAL USAGE</th>
                <th className="px-5 py-3 text-right">FROM</th>
              </tr>
            </thead>
            <tbody className="bg-[#ffffff]">
              {licenseRows.map((r) => (
                <tr key={r.license} className="border-t border-[#ececec]">
                  <td className="px-5 py-4 font-semibold">{r.license}</td>
                  <td className="px-5 py-4 text-[#6b716d]">{r.usage}</td>
                  <td className="px-5 py-4 text-right font-serif text-lg">${r.from}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-16 flex flex-col items-center justify-between gap-6 border border-[#ececec] bg-[#fafafa] p-8 sm:flex-row">
        <div>
          <h3 className="font-serif text-2xl">Can't find the image you need?</h3>
          <p className="mt-1 text-sm text-[#59645f]">Commission it with a curated request from $200.</p>
        </div>
        <Button onClick={openRequest}>Request a shoot</Button>
      </div>
    </div>
  );
}
