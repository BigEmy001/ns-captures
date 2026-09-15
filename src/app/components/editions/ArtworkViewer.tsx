import { useEffect, useState, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "framer-motion";
import { Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import type { DigitalEdition } from "../../data/editions";
import { Chip } from "./editionsUi";
import { monoLabelClass, secondaryButtonClass, tierLabel } from "./editionsFormat";
import { useBodyScrollLock } from "./useBodyScrollLock";

// Critically damped so the tilt settles without overshoot
const tiltSpring = { stiffness: 220, damping: 28, mass: 0.6 };
const MAX_TILT_DEG = 3;

/**
 * Artwork column for the edition detail page: ambient backdrop sampled from the
 * image, a gently tilting framed preview, and the capture settings underneath.
 */
export function ArtworkPreview({
  edition,
  onExpand,
}: {
  edition: DigitalEdition;
  onExpand: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === edition.image;
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - rect.left) / rect.width - 0.5) * MAX_TILT_DEG * 2);
    rotateX.set(-((e.clientY - rect.top) / rect.height - 0.5) * MAX_TILT_DEG * 2);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  // Uploaded artwork and profile pictures have no camera data to show
  const isArtwork = Boolean(edition.artworkSource) && edition.artworkSource !== "portfolio";
  const captureSettings = (
    isArtwork
      ? [{ label: "Medium", value: "Digital artwork" }]
      : [
          { label: "Camera", value: edition.camera },
          { label: "Lens", value: edition.lens },
          { label: "Aperture", value: edition.aperture },
          { label: "Shutter", value: edition.shutterSpeed },
          { label: "ISO", value: edition.iso ? String(edition.iso) : undefined },
        ]
  ).filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <div className="relative isolate flex flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      {/* Ambient wash sampled from the artwork */}
      <img
        src={edition.image}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-(--ed-ambient-opacity) blur-3xl saturate-150"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-(--ed-surface)/30 via-(--ed-surface)/60 to-(--ed-surface)" />

      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap gap-2">
          <Chip>{tierLabel(edition)}</Chip>
          {edition.hasPhysicalTwin && edition.tier !== "physical_twin" && <Chip>+ Print twin</Chip>}
        </div>
        <button
          type="button"
          onClick={onExpand}
          className={`${secondaryButtonClass} h-8 px-3 text-xs`}
        >
          <Maximize2 className="size-3.5" />
          Full screen
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 [perspective:1200px] sm:p-6">
        <motion.button
          type="button"
          onClick={onExpand}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
          aria-label={`View ${edition.title} full size`}
          style={{ rotateX, rotateY }}
          className={`group relative block max-h-full max-w-full cursor-zoom-in overflow-hidden rounded-lg shadow-(--ed-shadow-lg) outline outline-1 -outline-offset-1 outline-(--ed-image-outline) ${
            loaded ? "" : "min-h-60 min-w-60"
          }`}
        >
          {!loaded && (
            <span aria-hidden className="absolute inset-0 animate-pulse bg-(--ed-raised)" />
          )}
          <img
            src={edition.image}
            alt={edition.title}
            onLoad={() => setLoadedSrc(edition.image)}
            className={`block h-auto max-h-[70vh] w-auto max-w-full object-contain transition-[opacity,filter,scale] duration-500 ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100 lg:max-h-[calc(100dvh-17rem)] ${
              loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"
            }`}
          />
          <span className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 translate-y-2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-[#fff] opacity-0 backdrop-blur-md transition-[opacity,translate] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <Maximize2 className="size-3.5" />
            Click to expand
          </span>
        </motion.button>
      </div>

      {captureSettings.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-(--ed-border) px-4 py-4 min-[480px]:grid-cols-3 sm:px-6 xl:grid-cols-5">
          {captureSettings.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className={monoLabelClass}>{item.label}</dt>
              <dd className="truncate pt-1 text-sm text-(--ed-text)" title={item.value}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Full-screen viewer: click to zoom, move the pointer to pan, Esc or the backdrop to close. */
export function ArtworkLightbox({
  edition,
  open,
  onClose,
}: {
  edition: DigitalEdition;
  open: boolean;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomed(false);
        onClose();
      }
      if (e.key === "z" || e.key === "Z") setZoomed((z) => !z);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const close = () => {
    setZoomed(false);
    onClose();
  };

  const trackPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  };

  const lightboxButtonClass =
    "flex size-10 items-center justify-center rounded-full bg-[#fff]/10 text-[#fff] transition-colors hover:bg-[#fff]/20";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${edition.title}, full size`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="fixed inset-0 z-50 flex flex-col bg-black/95 font-sans text-[#fff] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{edition.title}</p>
              <p className="truncate text-xs text-[#fff]/60">{edition.photographerName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-pressed={zoomed}
                aria-label={zoomed ? "Zoom out" : "Zoom in"}
                className={lightboxButtonClass}
              >
                {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close full size image"
                className={lightboxButtonClass}
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8"
            onClick={close}
            onPointerDown={trackPointer}
            onPointerMove={(e) => zoomed && trackPointer(e)}
          >
            <motion.img
              src={edition.image}
              alt={edition.title}
              draggable={false}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: zoomed ? 2.2 : 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0 }}
              style={{ transformOrigin: origin }}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
              className={`max-h-full max-w-full select-none rounded object-contain ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            />
          </div>

          <p className="pb-4 text-center font-mono text-xs uppercase text-[#fff]/50">
            {zoomed
              ? "Move to pan · click to zoom out"
              : "Click to zoom · Z to toggle · Esc to close"}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
