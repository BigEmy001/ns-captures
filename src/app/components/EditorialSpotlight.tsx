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
    <section className="border-y border-[#ececec] bg-gradient-to-b from-[#fafafa] to-[#f4f5f2] py-16 sm:py-24">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Eyebrow Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f]">
              <Sparkles className="size-3.5" />
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1e4a3f]">
              {headline}
            </span>
          </div>
          <Link
            to={`/photographer/${photographer.id}`}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#1e4a3f] hover:text-[#123b31]"
          >
            <span>View Creator Profile</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Main Editorial Card */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 rounded-3xl border border-[#e5e7e2] bg-white p-6 sm:p-10 ns-shadow-md">
          {/* Left Column: Photograph Display & EXIF Craft */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="group relative overflow-hidden rounded-2xl bg-[#0f1715] aspect-[4/3] sm:aspect-[16/11]">
              <img
                src={getOptimizedImageUrl(photo.image, 1400)}
                alt={photo.title}
                className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Photo pill badge */}
              <div className="absolute top-4 left-4 rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                Photograph of the Week
              </div>

              {/* Category tag */}
              {photo.category && (
                <div className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#18211f] backdrop-blur-md">
                  {photo.category}
                </div>
              )}

              {/* Quick license CTA on hover */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-xs font-medium drop-shadow-sm">
                  {photo.location || photographer.location}
                </span>
                <Link
                  to={`/photos/${photo.id}`}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#18211f] shadow-md transition hover:bg-[#f0f0f0]"
                >
                  License This Shot
                </Link>
              </div>
            </div>

            {/* Technical Metadata Rail */}
            {(photo.camera || photo.lens || photo.aperture || photo.shutterSpeed || photo.iso) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#f0f0ee] pt-4 text-[11px] text-[#59645f]">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#8a8f89]">
                  <Camera className="size-3 text-[#1e4a3f]" /> Craft Specs:
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

          {/* Right Column: Photographer Profile & Story */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Creator Card */}
              <Link
                to={`/photographer/${photographer.id}`}
                className="group flex items-center justify-between rounded-2xl border border-[#ececec] bg-[#fafbf9] p-4 transition hover:border-[#1e4a3f]/50"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar className="size-14 ring-2 ring-[#1e4a3f]/10">
                    <AvatarImage
                      src={getOptimizedImageUrl(photographer.avatar, 150)}
                      alt={photographer.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-[#e7ebe2] text-[#1e4a3f] font-mono text-sm font-semibold">
                      {photographer.name?.slice(0, 2).toUpperCase() || "NS"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-serif text-xl font-medium text-[#18211f] group-hover:text-[#1e4a3f]">
                        {photographer.name}
                      </h3>
                      {photographer.verified && (
                        <span className="text-[#1e4a3f]" title="Verified Contributor">
                          ●
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6b716d]">
                      <MapPin className="size-3 text-[#1e4a3f]" />
                      <span>{photographer.location}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-semibold text-[#18211f]">
                    {photographer.images}
                  </span>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#8a8f89]">
                    Portfolio
                  </p>
                </div>
              </Link>

              {/* Title & Story */}
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl leading-[1.12] text-[#18211f]">
                  {title}
                </h2>

                <div className="mt-4 rounded-xl border-l-2 border-[#1e4a3f] bg-[#f8f9f7] pl-4 pr-3 py-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1e4a3f]">
                    About the Picture
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4a534e]">{story}</p>
                </div>
              </div>

              {/* Quote if provided */}
              {quote && (
                <div className="relative pl-7 italic text-sm text-[#59645f] leading-relaxed">
                  <Quote className="absolute left-0 top-0 size-4 text-[#1e4a3f]/40 -scale-x-100" />"
                  {quote}"
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 border-t border-[#f0f0ee] pt-6">
              <Link
                to={`/photos/${photo.id}`}
                className="rounded-full bg-[#1e4a3f] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#123b31]"
              >
                License Photograph
              </Link>
              <Link
                to={`/photographer/${photographer.id}`}
                className="rounded-full border border-[#ececec] bg-white px-5 py-2.5 text-xs font-semibold text-[#18211f] transition hover:bg-[#f8f9f7]"
              >
                Explore {photographer.name.split(" ")[0]}'s Portfolio →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
