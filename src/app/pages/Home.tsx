import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Camera, Upload, Quote } from "lucide-react";
import { HeroSearch } from "../components/HeroSearch";
import { CategoryNav } from "../components/CategoryNav";
import { TopicRail } from "../components/TopicRail";
import { PhotoCard } from "../components/PhotoCard";
import { Eyebrow, Button, Badge, PartnerButton } from "../components/ui";
import { useRequest } from "../components/RequestModal";
import { photos as fallbackPhotos, collections as fallbackCollections, photographers as fallbackPhotographers, briefs as fallbackBriefs } from "../data/photos";
import { fetchPhotos, fetchCollections, fetchPhotographers, fetchBriefs } from "../data/db";
import { AnimatedRays } from "../components/ui/animated-rays";

const heroImage =
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=86&w=1800";

const testimonials = [
  { quote: "The request system got us imagery no library had. On brand, on budget, in three days.", name: "Aïcha Bello", role: "Creative Director, Mainland Studio" },
  { quote: "Clean licensing our legal team actually understands. That alone changed how we buy.", name: "Daniel Okoro", role: "Head of Brand, Paystack-scale fintech" },
  { quote: "It feels like a design tool, not a stock site. We live in it now.", name: "Marta Ruiz", role: "Art Buyer, Continental Press" },
];

const companies = ["MERIDIAN", "PALMWINE", "NORTHWIND", "STUDIO LINE", "CONTINENTAL", "ATLAS & CO"];

export function Home() {
  const openRequest = useRequest();
  const [photos, setPhotos] = useState(fallbackPhotos);
  const [collections, setCollections] = useState(fallbackCollections);
  const [photographers, setPhotographers] = useState(fallbackPhotographers);
  const [briefs, setBriefs] = useState(fallbackBriefs);

  useEffect(() => {
    Promise.all([
      fetchPhotos().catch(() => {}),
      fetchCollections().catch(() => {}),
      fetchPhotographers().catch(() => {}),
      fetchBriefs().catch(() => {}),
    ]).then(([photos, collections, photographers, briefs]) => {
      if (photos) setPhotos(photos);
      if (collections) setCollections(collections);
      if (photographers) setPhotographers(photographers);
      if (briefs) setBriefs(briefs);
    });
  }, []);

  return (
    <>
      {/* Hero — cinematic, full-bleed */}
      <section className="relative flex min-h-[720px] items-end overflow-hidden bg-[#213e35] text-[#ffffff]">
        <img
          src={heroImage}
          alt="Editorial photography"
          className="absolute inset-0 size-full object-cover"
        />
        {/* Animated Rays overlay blending on top of the image */}
        <div className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none">
          <AnimatedRays />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d211b] via-[#0d211b]/40 to-[#0d211b]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d211b]/70 via-transparent to-transparent" />

        <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-40 sm:px-8 lg:px-12 lg:pb-20">
          <p className="font-mono text-[10px] tracking-[0.24em] text-white/70">THE VISUAL REFERENCE LIBRARY — 2026</p>
          <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.8rem,6vw,5.6rem)] font-medium leading-[0.95] tracking-[-0.03em]">
            Find the image
            <br />
            behind the <em className="italic">idea.</em>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/70">
            Discover, describe, or commission the exact photograph your work needs — licensed with rights you can trust.
          </p>
          <div className="mt-8 hero-search-wrapper">
            <HeroSearch />
          </div>
          <p className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/70">
            Trending:
            {["Lagos", "Quiet architecture", "New perspectives", "Editorial portrait"].map((t) => (
              <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="underline underline-offset-4 hover:text-white">
                {t}
              </Link>
            ))}
          </p>
        </div>
      </section>

      {/* Pill category nav */}
      <CategoryNav active="All" />

      {/* Explore + topic rail + gallery */}
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-3xl sm:text-4xl">Explore the library</h2>
          <Link to="/search" className="text-sm font-semibold text-[#1e4a3f] hover:underline">See all</Link>
        </div>
        <TopicRail />

        <div className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          {photos.map((p) => (
            <div key={p.id} className="break-inside-avoid">
              <PhotoCard item={p} />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/search"><Button variant="outline">Load the full library</Button></Link>
        </div>
      </section>

      {/* Collections */}
      <section className="border-y border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-10 flex items-end justify-between gap-5">
            <div>
              <Eyebrow>FEATURED COLLECTIONS</Eyebrow>
              <h2 className="mt-3 font-serif text-4xl leading-[1.03] sm:text-5xl">Themes worth returning to.</h2>
            </div>
            <Link to="/collections" className="hidden shrink-0 text-sm font-semibold text-[#1e4a3f] hover:underline sm:block">
              All collections
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((c) => (
              <Link key={c.id} to="/collections" className="group">
                <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-[#d7d8d2]">
                  <img src={c.cover[0]} alt="" loading="lazy" className="col-span-1 row-span-2 size-full object-cover transition group-hover:scale-[1.03]" />
                  <img src={c.cover[1]} alt="" loading="lazy" className="size-full object-cover" />
                  <img src={c.cover[2]} alt="" loading="lazy" className="size-full object-cover" />
                </div>
                <div className="flex items-start justify-between pt-3">
                  <div>
                    <h3 className="font-serif text-lg leading-none">{c.title}</h3>
                    <p className="mt-1.5 text-xs text-[#6b716d]">{c.count} images · {c.curator}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Requests */}
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 md:items-center lg:px-12 lg:py-24">
        <div>
          <Eyebrow>BEYOND THE ARCHIVE</Eyebrow>
          <h2 className="mt-4 font-serif text-4xl leading-[1.05] sm:text-5xl">When the image does not exist, commission it.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[#59645f]">
            Turn a creative need into a precise brief. We connect your team to trusted photographers who know the place,
            the moment, and the work.
          </p>
          <div className="mt-8 flex gap-4">
            <Button onClick={openRequest}>Request a shoot</Button>
            <Link to="/requests"><Button variant="outline">See live briefs</Button></Link>
          </div>
        </div>
        <div className="border border-[#e2e2e2] bg-[#fafafa] p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-[#ececec] pb-5">
            <span className="font-mono text-[10px] tracking-[0.14em] text-[#49685d]">ACTIVE BRIEF / {briefs[0].id}</span>
            <Badge>{briefs[0].status}</Badge>
          </div>
          <h3 className="mt-8 font-serif text-2xl">{briefs[0].title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#68706b]">{briefs[0].description}</p>
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-[#ececec] pt-5">
            <div><p className="font-mono text-[9px] text-[#758078]">LICENSE</p><p className="mt-1 text-xs font-semibold">Commercial</p></div>
            <div><p className="font-mono text-[9px] text-[#758078]">BUDGET</p><p className="mt-1 text-xs font-semibold">${briefs[0].budget}</p></div>
            <div><p className="font-mono text-[9px] text-[#758078]">DELIVERY</p><p className="mt-1 text-xs font-semibold">{briefs[0].delivery}</p></div>
          </div>
        </div>
      </section>

      {/* Contributors */}
      <section className="border-y border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <Eyebrow>POPULAR CONTRIBUTORS</Eyebrow>
              <h2 className="mt-3 font-serif text-4xl leading-[1.03] sm:text-5xl">The eyes behind the work.</h2>
            </div>
            <Link to="/contribute" className="hidden text-sm font-semibold text-[#1e4a3f] hover:underline sm:block">
              Become a contributor
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {photographers.map((p) => (
              <Link key={p.id} to={`/photographer/${p.id}`} className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-5 transition hover:border-[#1e4a3f]">
                <div className="flex items-center gap-3">
                  <img src={p.avatar} alt={p.name} loading="lazy" className="size-12 rounded-full object-cover" />
                  <div>
                    <h3 className="font-serif text-lg leading-none">{p.name}</h3>
                    <p className="mt-1 text-xs text-[#6b716d]">{p.location}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-[#6b716d]">
                  <span>{p.specialty}</span>
                  <span>{p.followers} followers · {p.images} images</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Licensing */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Eyebrow>MADE FOR SERIOUS WORK</Eyebrow>
            <h2 className="mt-3 font-serif text-4xl leading-[1.04] sm:text-5xl">The calm way to manage visual rights.</h2>
            <Link to="/pricing" className="mt-6 inline-block text-sm font-semibold text-[#1e4a3f] hover:underline">
              Compare licenses →
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="border-t-2 border-[#1e4a3f] pt-4">
              <Camera className="size-5 text-[#1e4a3f]" />
              <h3 className="mt-8 font-serif text-2xl">Rights, clear</h3>
              <p className="mt-2 text-sm leading-6 text-[#68706b]">Every use case has a plain-language license, ready for legal teams and global campaigns.</p>
            </div>
            <div className="border-t-2 border-[#1e4a3f] pt-4">
              <Upload className="size-5 text-[#1e4a3f]" />
              <h3 className="mt-8 font-serif text-2xl">One shared source</h3>
              <p className="mt-2 text-sm leading-6 text-[#68706b]">Save, license and organize imagery with the people making the work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <Eyebrow>TRUSTED BY TEAMS</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">What our partners say.</h2>
            </div>
            <PartnerButton onClick={openRequest} label="Become a partner" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="border border-[#ececec] bg-[#ffffff] ns-shadow-sm p-6">
                <Quote className="size-6 text-[#1e4a3f]" />
                <p className="mt-4 font-serif text-xl leading-snug">{t.quote}</p>
                <footer className="mt-6 text-xs text-[#6b716d]">
                  <span className="font-semibold text-[#18211f]">{t.name}</span> — {t.role}
                </footer>
              </blockquote>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
            {companies.map((c) => (
              <span key={c} className="font-mono text-sm tracking-[0.2em] text-[#4a534e]">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#182e27] px-5 py-20 text-[#f4f1e9] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <h2 className="max-w-xl font-serif text-4xl leading-[1.05] sm:text-5xl">Start building your visual library today.</h2>
            <p className="mt-4 max-w-md text-white/60">Free to browse. Simple to license. Ready when your ideas are.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/pricing"><Button variant="light">See pricing</Button></Link>
            <Link to="/search"><Button variant="light">Explore the library</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
