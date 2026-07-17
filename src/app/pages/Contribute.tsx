import { useState } from "react";
import { Upload, DollarSign, Globe, BadgeCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow, Button, PartnerButton } from "../components/ui";
import { logActivity } from "../data/db";

const perks = [
  { icon: DollarSign, title: "Keep more", body: "Industry-leading royalties, paid monthly with transparent reporting." },
  { icon: Globe, title: "Global reach", body: "Your work in front of agencies, publishers and brands worldwide." },
  { icon: BadgeCheck, title: "Get verified", body: "Earn a verified badge and priority in curated requests." },
];

export function Contribute() {
  const [email, setEmail] = useState("");

  return (
    <div>
      <section className="relative overflow-hidden bg-[#213e35] text-[#ffffff]">
        <div className="absolute inset-0 grid grid-cols-4 opacity-25">
          {[]}
        </div>
        <div className="absolute inset-0 bg-[#17372f]/70" />
        <div className="relative z-10 mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12">
          <p className="font-mono text-[10px] tracking-[0.2em] text-white/70">CONTRIBUTOR PROGRAM</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.03] sm:text-6xl">
            Your eye belongs in the archive.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-white/80">
            Sell your photography to serious buyers, accept curated shoot requests, and build a following on a platform that treats the image as the hero.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); logActivity({ userId: `CONTRIBUTE-${email}`, type: "contribute", title: "Contributor application", desc: email }); toast.success("Application started", { description: "Check your inbox to complete onboarding." }); setEmail(""); }}
            className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@studio.com"
              className="flex-1 border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50 focus:border-white"
            />
            <button className="bg-white px-5 py-3 text-sm font-semibold text-[#1e4a3f]">Apply now</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-3">
          {perks.map((p) => (
            <div key={p.title} className="border-t-2 border-[#1e4a3f] pt-4">
              <p.icon className="size-5 text-[#1e4a3f]" />
              <h3 className="mt-8 font-serif text-2xl">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#68706b]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", icon: Upload, t: "Upload your best", b: "Submit a portfolio of 10+ images for review." },
              { n: "02", icon: BadgeCheck, t: "Get approved", b: "Our editors review within 3 business days." },
              { n: "03", icon: DollarSign, t: "Start earning", b: "Set licenses, take requests, and get paid monthly." },
            ].map((s) => (
              <div key={s.n} className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-[#1e4a3f]" />
                  <span className="font-mono text-xs text-[#758078]">{s.n}</span>
                </div>
                <h3 className="mt-6 font-serif text-xl">{s.t}</h3>
                <p className="mt-2 text-sm text-[#68706b]">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1440px] flex-col items-center gap-4 px-5 py-20 text-center sm:px-8 lg:px-12">
        <h2 className="max-w-2xl font-serif text-4xl leading-[1.04] sm:text-5xl">Join thousands of photographers shaping the archive.</h2>
        <PartnerButton onClick={() => { logActivity({ userId: "CONTRIBUTE-BUTTON", type: "contribute", title: "Contributor CTA clicked", desc: "Used bottom CTA" }); toast.success("Application started"); }} label="Become a contributor" className="mt-4" />
      </section>
    </div>
  );
}
