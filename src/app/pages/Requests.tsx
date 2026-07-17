import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Send, Users, ShieldCheck } from "lucide-react";
import { Eyebrow, Button, Badge } from "../components/ui";
import { useRequest } from "../components/RequestModal";
import { fetchBriefs } from "../data/db";
import type { Brief } from "../data/photos";

const steps = [
  { icon: Send, title: "Write a brief", body: "Describe the image you need, the license, budget and deadline." },
  { icon: Users, title: "Get matched", body: "We route it to vetted photographers who know the subject and place." },
  { icon: ShieldCheck, title: "License & receive", body: "Approve the shortlist, license the frame, and download in days." },
];

export function Requests() {
  const openRequest = useRequest();
  const [briefs, setBriefs] = useState<Brief[]>([]);

  useEffect(() => {
    fetchBriefs().then(setBriefs);
  }, []);

  return (
    <div>
      <section className="border-b border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <Eyebrow>CURATED REQUESTS</Eyebrow>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.04] sm:text-6xl">
            When the perfect image doesn't exist yet, commission it.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-[#59645f]">
            Put a creative brief in front of a trusted network of photographers. Real people, real places, made to order.
          </p>
          <Button onClick={openRequest} className="mt-8">Start a brief <ArrowRight className="size-4" /></Button>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="border-t-2 border-[#1e4a3f] pt-4">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-[#1e4a3f]" />
                <span className="font-mono text-xs text-[#758078]">0{i + 1}</span>
              </div>
              <h3 className="mt-8 font-serif text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#68706b]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live briefs */}
      <section className="border-t border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <Eyebrow>OPEN TO PHOTOGRAPHERS</Eyebrow>
              <h2 className="mt-3 font-serif text-4xl leading-[1.03] sm:text-5xl">Live briefs.</h2>
            </div>
            <Link to="/contribute" className="hidden text-sm font-semibold text-[#1e4a3f] hover:underline sm:block">
              Join the network
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {briefs.map((b) => (
              <div key={b.id} className="border border-[#e2e2e2] bg-[#ffffff] p-6">
                <div className="flex items-center justify-between border-b border-[#ececec] pb-4">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-[#49685d]">BRIEF / {b.id}</span>
                  <Badge tone={b.status === "DELIVERED" ? "muted" : "green"}>{b.status}</Badge>
                </div>
                <h3 className="mt-6 font-serif text-2xl">{b.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#68706b]">{b.description}</p>
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#ececec] pt-4">
                  <div><p className="font-mono text-[9px] text-[#758078]">LICENSE</p><p className="mt-1 text-xs font-semibold capitalize">{b.license.toLowerCase()}</p></div>
                  <div><p className="font-mono text-[9px] text-[#758078]">BUDGET</p><p className="mt-1 text-xs font-semibold">${b.budget}</p></div>
                  <div><p className="font-mono text-[9px] text-[#758078]">DELIVERY</p><p className="mt-1 text-xs font-semibold">{b.delivery}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
