import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { MaskIcon } from "../components/MaskIcon";
import { EditionsShell } from "../components/editions/EditionsShell";
import { EmptyState } from "../components/editions/editionsUi";
import { NftGuideCard } from "../components/editions/Nft101Section";
import { useEditionVault } from "../components/editions/useEditionVault";
import {
  fadeUpVariants,
  monoLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionReveal,
} from "../components/editions/editionsFormat";
import { getDepositConfig, getPublishedEditions } from "../data/editions";
import {
  NFT_101_RETURN_KEY,
  NFT_101_SECTION_ID,
  NFT_GUIDES,
  getNftGuide,
  guideReadMinutes,
  guideText,
  nftGuideHref,
  type GuideContext,
  type NftGuide,
} from "../data/nftGuides";
import chevronLeftIcon from "../../assets/edition-detail/chevron-left.svg";

function GuideNavLink({ guide, direction }: { guide: NftGuide; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  return (
    <Link
      to={nftGuideHref(guide.slug)}
      className={`group flex items-center gap-3 rounded-xl border border-(--ed-border) bg-(--ed-surface) p-4 transition-colors hover:bg-(--ed-raised) ${
        isNext ? "flex-row-reverse text-right sm:col-start-2" : ""
      }`}
    >
      <MaskIcon
        src={chevronLeftIcon}
        className={`size-4 text-(--ed-muted) transition-transform duration-200 ${
          isNext ? "rotate-180 group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className={monoLabelClass}>{isNext ? "Next guide" : "Previous guide"}</span>
        <span className="mt-1 block truncate text-sm font-medium text-(--ed-text)">
          {guide.title}
        </span>
      </span>
    </Link>
  );
}

export function EditionsLearnArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { walletLabel } = useEditionVault();
  const guide = getNftGuide(slug);
  const ctx = useMemo<GuideContext>(() => ({ deposit: getDepositConfig() }), []);
  // "What is an NFT?" shares the marketplace's featured artwork until its own image is added
  const fallbackImage = useMemo(() => {
    const editions = getPublishedEditions();
    return (editions.find((e) => e.featured) ?? editions[0])?.image;
  }, []);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Highlight the table-of-contents entry for the section being read
  useEffect(() => {
    if (!guide || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActiveSection(inView[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px" },
    );
    guide.sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [guide]);

  if (!guide) {
    return (
      <EditionsShell walletLabel={walletLabel}>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <EmptyState
              title="Guide not found"
              description="This NFT 101 guide doesn’t exist or has moved."
              action={
                <Link to="/editions" className={`${primaryButtonClass} h-10 px-5 text-sm`}>
                  Back to Editions
                </Link>
              }
            />
          </div>
        </main>
      </EditionsShell>
    );
  }

  const index = NFT_GUIDES.findIndex((item) => item.slug === guide.slug);
  const previousGuide = index > 0 ? NFT_GUIDES[index - 1] : null;
  const nextGuide = index < NFT_GUIDES.length - 1 ? NFT_GUIDES[index + 1] : null;
  const relatedGuides = NFT_GUIDES.filter((item) => item.slug !== guide.slug);
  const heroImage = guide.image ?? fallbackImage;
  const currentSection =
    activeSection && guide.sections.some((section) => section.id === activeSection)
      ? activeSection
      : guide.sections[0]?.id;

  const goBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex === 0) {
      navigate(`/editions#${NFT_101_SECTION_ID}`);
      return;
    }
    if ((location.state as { from?: string } | null)?.from === NFT_101_SECTION_ID) {
      try {
        sessionStorage.setItem(NFT_101_RETURN_KEY, "1");
      } catch {
        // Storage unavailable: the marketplace opens at the top instead
      }
    }
    navigate(-1);
  };

  const jumpTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setActiveSection(id);
  };

  return (
    <EditionsShell activeRail="discover" walletLabel={walletLabel}>
      <main className="relative isolate flex flex-1 flex-col px-4 pb-20 pt-6 sm:px-6">
        {/* Soft animated wash in the guide's tints; clipped to its own box so the sticky TOC still works */}
        <div
          key={guide.slug}
          aria-hidden
          className="ed-article-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden sm:h-[640px]"
          style={{ "--ed-glow-a": guide.glow[0], "--ed-glow-b": guide.glow[1] } as CSSProperties}
        >
          <div className="ed-article-glow__inner absolute inset-0">
            <span className="ed-article-glow__blob ed-article-glow__blob--a" />
            <span className="ed-article-glow__blob ed-article-glow__blob--b" />
            <span className="ed-article-glow__blob ed-article-glow__blob--c" />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1080px] flex-col">
          {/* Back + breadcrumb */}
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              className={`${secondaryButtonClass} h-9 shrink-0 pl-3 pr-4 text-sm`}
            >
              <MaskIcon src={chevronLeftIcon} className="size-4" />
              Back
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-2 text-sm text-(--ed-muted)">
                <li className="shrink-0">
                  <Link to="/editions" className="transition-colors hover:text-(--ed-text)">
                    Marketplace
                  </Link>
                </li>
                <li aria-hidden className="shrink-0">
                  /
                </li>
                <li className="shrink-0">
                  <Link to="/editions#nft-101" className="transition-colors hover:text-(--ed-text)">
                    NFT 101
                  </Link>
                </li>
                <li aria-hidden className="hidden shrink-0 sm:block">
                  /
                </li>
                <li
                  aria-current="page"
                  className="hidden min-w-0 truncate text-(--ed-text) sm:block"
                >
                  {guide.title}
                </li>
              </ol>
            </nav>
          </div>

          {/* Article header */}
          <header className="mt-8 grid items-center gap-8 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12">
            <motion.div
              key={`${guide.slug}-intro`}
              initial="hidden"
              animate="visible"
              variants={fadeUpVariants}
              className="flex min-w-0 flex-col items-start"
            >
              <p className={monoLabelClass}>
                NFT 101 · Guide {index + 1} of {NFT_GUIDES.length} · {guideReadMinutes(guide, ctx)}{" "}
                min read
              </p>
              <h1 className="mt-3 text-balance text-[32px] font-medium leading-10 tracking-[-0.4px] text-(--ed-text) sm:text-[44px] sm:leading-[52px]">
                {guide.title}
              </h1>
              <p className="mt-4 max-w-[620px] text-pretty text-base leading-7 text-(--ed-text-soft) sm:text-lg sm:leading-8">
                {guide.summary}
              </p>
            </motion.div>
            {heroImage && (
              <motion.div
                key={`${guide.slug}-hero`}
                initial="hidden"
                animate="visible"
                custom={0.08}
                variants={fadeUpVariants}
                className="overflow-hidden rounded-xl bg-(--ed-raised) outline outline-1 -outline-offset-1 outline-(--ed-image-outline)"
              >
                <img src={heroImage} alt="" className="aspect-[3/2] w-full object-cover" />
              </motion.div>
            )}
          </header>

          <div className="mt-12 grid gap-10 border-t border-(--ed-border) pt-10 lg:mt-16 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16 lg:pt-12">
            {/* Table of contents */}
            <aside className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-24">
                <p className={monoLabelClass}>On this page</p>
                <ul className="mt-4 flex flex-col border-l border-(--ed-border)">
                  {guide.sections.map((section) => {
                    const active = currentSection === section.id;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            jumpTo(section.id);
                          }}
                          aria-current={active ? "location" : undefined}
                          className={`-ml-px block border-l py-1.5 pl-4 text-sm leading-5 transition-colors ${
                            active
                              ? "border-(--ed-text) text-(--ed-text)"
                              : "border-transparent text-(--ed-muted) hover:text-(--ed-text)"
                          }`}
                        >
                          {section.heading}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            <div className="min-w-0 max-w-[720px]">
              {/* Article body */}
              <article>
                {guide.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-heading`}
                    className="scroll-mt-24 border-t border-(--ed-divider) py-8 first:border-t-0 first:pt-0"
                  >
                    <h2
                      id={`${section.id}-heading`}
                      className="text-xl font-medium leading-7 tracking-[-0.3px] text-(--ed-text) sm:text-2xl sm:leading-8"
                    >
                      {section.heading}
                    </h2>
                    <div className="mt-4 flex flex-col gap-4 text-[15px] leading-7 text-(--ed-text-soft)">
                      {section.paragraphs?.map((paragraph, idx) => (
                        <p key={idx} className="text-pretty">
                          {guideText(paragraph, ctx)}
                        </p>
                      ))}
                      {section.bullets && (
                        <ul className="flex flex-col gap-3">
                          {section.bullets.map((bullet, idx) => (
                            <li key={idx} className="flex gap-3">
                              <span
                                aria-hidden
                                className="mt-[11px] size-1.5 shrink-0 rounded-full bg-(--ed-muted)"
                              />
                              <span className="min-w-0 text-pretty">
                                {bullet.term && (
                                  <span className="block font-medium text-(--ed-text)">
                                    {bullet.term}
                                  </span>
                                )}
                                {guideText(bullet.text, ctx)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.closing?.map((paragraph, idx) => (
                        <p key={idx} className="text-pretty">
                          {guideText(paragraph, ctx)}
                        </p>
                      ))}
                      {section.note && (
                        <div className="rounded-lg border border-(--ed-border) bg-(--ed-surface) p-4">
                          <p className={monoLabelClass}>Good to know</p>
                          <p className="mt-2 text-sm leading-6 text-(--ed-text-soft)">
                            {guideText(section.note, ctx)}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </article>

              {/* After the article */}
              <motion.section
                {...sectionReveal}
                aria-labelledby="takeaways-heading"
                className="mt-4 rounded-xl border border-(--ed-border) bg-(--ed-surface) p-5 sm:p-6"
              >
                <h2 id="takeaways-heading" className="text-lg font-medium text-(--ed-text)">
                  Key takeaways
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {guide.takeaways.map((takeaway) => (
                    <li
                      key={takeaway}
                      className="flex gap-3 text-sm leading-6 text-(--ed-text-soft)"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-(--ed-positive)/15 text-(--ed-positive)">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </motion.section>

              <motion.section {...sectionReveal} aria-labelledby="faq-heading" className="mt-12">
                <h2
                  id="faq-heading"
                  className="text-xl font-medium tracking-[-0.3px] text-(--ed-text)"
                >
                  Common questions
                </h2>
                <div className="mt-4 divide-y divide-(--ed-border) rounded-xl border border-(--ed-border) bg-(--ed-surface)">
                  {guide.faqs.map((faq) => (
                    <details key={faq.question} className="group px-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-(--ed-text) [&::-webkit-details-marker]:hidden">
                        {faq.question}
                        <MaskIcon
                          src={chevronLeftIcon}
                          className="size-4 -rotate-90 text-(--ed-muted) transition-transform duration-200 group-open:rotate-90"
                        />
                      </summary>
                      <p className="pb-4 text-sm leading-6 text-(--ed-text-soft)">
                        {guideText(faq.answer, ctx)}
                      </p>
                    </details>
                  ))}
                </div>
              </motion.section>

              <motion.section
                {...sectionReveal}
                aria-label="Next step"
                className="mt-12 flex flex-col gap-4 rounded-xl border border-(--ed-border) bg-(--ed-surface) p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="min-w-0">
                  <p className={monoLabelClass}>Put it into practice</p>
                  <p className="mt-2 text-base font-medium text-(--ed-text)">{guide.cta.prompt}</p>
                </div>
                <Link
                  to={guide.cta.to}
                  className={`${primaryButtonClass} h-10 shrink-0 px-5 text-sm`}
                >
                  {guide.cta.label}
                  <ArrowUpRight className="size-4" />
                </Link>
              </motion.section>

              {(previousGuide || nextGuide) && (
                <nav aria-label="More guides" className="mt-12 grid gap-3 sm:grid-cols-2">
                  {previousGuide && <GuideNavLink guide={previousGuide} direction="previous" />}
                  {nextGuide && <GuideNavLink guide={nextGuide} direction="next" />}
                </nav>
              )}
            </div>
          </div>

          {/* Related guides */}
          <motion.section
            {...sectionReveal}
            aria-labelledby="more-guides-heading"
            className="mt-16 border-t border-(--ed-border) pt-10"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  id="more-guides-heading"
                  className="text-xl font-medium leading-[25px] tracking-[-0.3px] text-(--ed-text)"
                >
                  More from NFT 101
                </h2>
                <p className="mt-1 text-sm text-(--ed-muted)">
                  Keep learning about NFTs, Web3, and more.
                </p>
              </div>
              <Link
                to="/editions"
                className="text-sm font-medium text-(--ed-text) transition-colors hover:text-(--ed-text-soft)"
              >
                Back to marketplace
              </Link>
            </div>
            <ul className="mt-5 grid grid-cols-1 gap-x-4 gap-y-6 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {relatedGuides.map((item) => (
                <li key={item.slug}>
                  <NftGuideCard
                    guide={item}
                    image={item.image ?? fallbackImage}
                    meta={`${guideReadMinutes(item, ctx)} min read`}
                  />
                </li>
              ))}
            </ul>
          </motion.section>
        </div>
      </main>
    </EditionsShell>
  );
}
