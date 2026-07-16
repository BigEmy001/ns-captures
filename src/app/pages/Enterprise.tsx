import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  FolderKanban, Library, FileText, ShieldCheck, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Eyebrow, Button, Badge } from "../components/ui";
import { useRequest } from "../components/RequestModal";
import { photos, collections } from "../data/photos";

const features = [
  { icon: FolderKanban, title: "Projects & briefs", body: "Organise creative work into projects with approval workflows." },
  { icon: Library, title: "Brand libraries", body: "Shared, permissioned collections your whole team can license from." },
  { icon: FileText, title: "Contracts & invoices", body: "Custom licensing, consolidated billing, downloadable audit trails." },
  { icon: ShieldCheck, title: "Usage tracking", body: "Know exactly where every licensed asset is live across campaigns." },
];

const projects = [
  { name: "Q3 Brand Refresh", assets: 42, members: 6, status: "IN PROGRESS" as const },
  { name: "Fintech Launch Campaign", assets: 18, members: 4, status: "APPROVAL" as const },
  { name: "Annual Report 2026", assets: 27, members: 3, status: "COMPLETE" as const },
];

export function Enterprise() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "portal" ? "portal" : "overview";
  const setTab = (nextTab: "overview" | "portal") => {
    const next = new URLSearchParams(params);
    if (nextTab === "overview") next.delete("tab");
    else next.set("tab", nextTab);
    setParams(next);
  };
  const openRequest = useRequest();

  return (
    <div>
      {/* Tab switch */}
      <div className="border-b border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto flex max-w-[1440px] gap-6 px-5 sm:px-8 lg:px-12">
          {(["overview", "portal"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative py-4 text-sm font-semibold capitalize transition ${tab === t ? "text-[#1e4a3f]" : "text-[#74766f]"}`}
            >
              {t === "portal" ? "Portal preview" : "For teams"}
              {tab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1e4a3f]" />}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <>
          <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
            <Eyebrow>ENTERPRISE PORTAL</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.04] sm:text-6xl">
              One visual operating system for your whole organisation.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-[#59645f]">
              Teams, projects, brand libraries, licensing and usage — managed together, with the controls enterprise buyers expect.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button onClick={() => setTab("portal")}>See the portal <ArrowRight className="size-4" /></Button>
              <Button variant="outline" onClick={openRequest}>Talk to sales</Button>
            </div>
          </section>

          <section className="border-y border-[#ececec] bg-[#fafafa]">
            <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
              {features.map((f) => (
                <div key={f.title} className="border-t-2 border-[#1e4a3f] pt-4">
                  <f.icon className="size-5 text-[#1e4a3f]" />
                  <h3 className="mt-8 font-serif text-2xl">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#68706b]">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <Eyebrow>WHY TEAMS SWITCH</Eyebrow>
                <h2 className="mt-3 font-serif text-4xl leading-[1.04] sm:text-5xl">Rights your legal team will actually approve.</h2>
                <ul className="mt-6 space-y-3">
                  {["Plain-language licenses & contracts", "SSO, roles and granular permissions", "Consolidated invoicing & procurement", "Priority access to curated requests"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[#4a534e]">
                      <CheckCircle2 className="size-5 text-[#1e4a3f]" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {photos.slice(0, 4).map((p) => (
                  <img key={p.id} src={p.image} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        // Portal preview
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Eyebrow>MERIDIAN STUDIO — WORKSPACE</Eyebrow>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Team workspace</h1>
            </div>
            <div className="flex -space-x-2">
              {photos.slice(0, 5).map((p) => (
                <img key={p.id} src={p.image} alt="" loading="lazy" className="size-9 rounded-full border-2 border-[#ffffff] object-cover" />
              ))}
              <span className="grid size-9 place-items-center rounded-full border-2 border-[#ffffff] bg-[#1e4a3f] text-xs text-white">+8</span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { label: "ACTIVE PROJECTS", value: "3" },
              { label: "LICENSED ASSETS", value: "87" },
              { label: "TEAM SEATS", value: "14" },
              { label: "SPEND (YTD)", value: "$18.4k" },
            ].map((s) => (
              <div key={s.label} className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-5">
                <p className="font-mono text-[9px] tracking-[0.1em] text-[#758078]">{s.label}</p>
                <p className="mt-2 font-serif text-3xl">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-6">
              <div className="mb-4 flex items-center gap-2">
                <FolderKanban className="size-5 text-[#1e4a3f]" />
                <h3 className="font-serif text-xl">Projects</h3>
              </div>
              <div className="space-y-3">
                {projects.map((p) => (
                  <div key={p.name} className="flex items-center justify-between border border-[#ececec] bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="mt-1 text-xs text-[#6b716d]">{p.assets} assets · {p.members} members</p>
                    </div>
                    <Badge tone={p.status === "COMPLETE" ? "muted" : "green"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-6">
              <div className="mb-4 flex items-center gap-2">
                <Library className="size-5 text-[#1e4a3f]" />
                <h3 className="font-serif text-xl">Brand libraries</h3>
              </div>
              <div className="space-y-3">
                {collections.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <img src={c.cover[0]} alt="" loading="lazy" className="size-12 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.title}</p>
                      <p className="text-xs text-[#6b716d]">{c.count} assets</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
