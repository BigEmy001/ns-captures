import { Link } from "react-router";
import { Camera, MapPin, ArrowRight, Quote, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getOptimizedImageUrl, type EditorialSpotlightData } from "../data/db";

interface EditorialSpotlightProps {
  data: EditorialSpotlightData | null;
}

export function EditorialSpotlight({ data }: EditorialSpotlightProps) {
  if (!data || !data.active) return null;

  const { photo, photographer, headline, title, story, quote } = data;

  return (
    <section className="border-y border-[#e5e1db] bg-[#f3f0eb] py-0 sm:py-0">
      <div className="mx-auto max-w-[1440px]">
        <div className="relative overflow-hidden bg-[#ebebe7]">
          <img
            src={getOptimizedImageUrl(photo.image, 1800)}
            alt={photo.title}
            className="h-[440px] w-full object-cover grayscale sm:h-[560px] lg:h-[660px]"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0a]/5 via-transparent to-[#f3f0eb]/5" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-5 sm:px-8 lg:px-10">
            <div className="font-serif text-[24px] leading-none tracking-[-0.05em] text-[#141414]">
              OMBRE
            </div>
            <Link
              to={`/photographer/${photographer.id}`}
              className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#1b1b1b]/80 transition hover:text-[#111111]"
            >
              Menu +
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-6 px-5 sm:px-8 lg:px-10">
            <div className="max-w-[18rem] sm:max-w-[22rem] lg:max-w-[26rem]">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#2e2d2a]/80 sm:text-[10px]">
                {headline}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f2f0ec] px-5 pb-16 pt-14 sm:px-8 lg:px-10 lg:pt-16">
          <div className="mb-8 flex flex-col gap-3 sm:gap-4 lg:mb-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#4f524f]">
              # Featured Photographer & Picture Spotlight
            </p>
            <h2 className="max-w-[18ch] font-serif text-[2.4rem] leading-[0.9] tracking-[-0.06em] text-[#111111] sm:text-[3.3rem] lg:text-[4.9rem]">
              {title}
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.3fr] lg:gap-12">
            <div className="pt-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#4f524f]">
                Here's a glimpse into the
              </p>
              <p className="mt-3 max-w-[18rem] font-serif text-[2.1rem] leading-[0.96] tracking-[-0.04em] text-[#121212] sm:text-[2.5rem]">
                {title}
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-base leading-relaxed text-[#2e2d2a] sm:text-lg">
                <span className="float-left pr-3 text-[4.5rem] font-serif leading-none text-[#1b1b1b]">
                  I
                </span>
                {story}
              </p>

              <div className="flex flex-col gap-5 border-t border-[#d8d2cb] pt-5">
                <p className="max-w-[38rem] text-sm leading-relaxed text-[#4f524f]">
                  {quote
                    ? `“${quote}”`
                    : `“${photographer.name} brings a rare sensitivity to the frame — quiet, intimate, and alive with atmosphere.”`}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    to={`/photo/${photo.id}`}
                    className="inline-flex items-center justify-center border border-[#1e4a3f] bg-[#1e4a3f] px-6 py-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white transition hover:bg-[#123b31]"
                  >
                    Inquire now
                  </Link>
                  <Link
                    to={`/photographer/${photographer.id}`}
                    className="inline-flex items-center justify-center border border-[#1d1d1d] bg-transparent px-6 py-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#141414] transition hover:bg-[#141414] hover:text-white"
                  >
                    Visit photographer profile
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-6 border-t border-[#d8d2cb] pt-6 text-[#141414] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#4f524f]">
                Visual artistry
              </p>
              <p className="mt-2 font-serif text-[2.1rem] leading-none tracking-[-0.04em]">
                Select Gallery
              </p>
            </div>

            <div className="max-w-[42rem] text-sm leading-relaxed text-[#4c4d49]">
              {photographer.name} is known for images that preserve atmosphere, stillness, and human
              presence in a way that feels both documentary and deeply personal.
            </div>
          </div>

          {(photo.camera || photo.lens || photo.aperture || photo.shutterSpeed || photo.iso) && (
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#d8d2cb] pt-4 text-[11px] text-[#59645f]">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a8f89]">
                <Camera className="size-3 text-[#1e4a3f]" /> Craft specs
              </span>
              {photo.camera && (
                <span className="rounded-md bg-[#f8f9f7] px-2.5 py-1 font-mono font-medium text-[#18211f]">
                  {photo.camera}
                </span>
              )}
              {photo.lens && (
                <span className="rounded-md bg-[#f8f9f7] px-2.5 py-1 font-mono text-[#59645f]">
                  {photo.lens}
                </span>
              )}
              {photo.focalLength && (
                <span className="rounded-md bg-[#f8f9f7] px-2.5 py-1 font-mono text-[#59645f]">
                  {photo.focalLength}
                </span>
              )}
              {photo.aperture && (
                <span className="rounded-md bg-[#f8f9f7] px-2.5 py-1 font-mono text-[#59645f]">
                  {photo.aperture}
                </span>
              )}
              {photo.shutterSpeed && (
                <span className="rounded-md bg-[#f8f9f7] px-2.5 py-1 font-mono text-[#59645f]">
                  {photo.shutterSpeed}
                </span>
              )}
              {photo.iso && (
                <span className="rounded-md bg-[#f8f9f7] px-2.5 py-1 font-mono text-[#59645f]">
                  ISO {photo.iso}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
