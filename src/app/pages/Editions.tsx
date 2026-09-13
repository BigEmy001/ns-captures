import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  Sparkles,
  ShieldCheck,
  Layers,
  Camera,
  Filter,
  Search,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  ShoppingBag,
  Award,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStoredEditions,
  getStoredOwnerships,
  getStoredActivity,
  purchaseEdition,
  type DigitalEdition,
  type EditionTier,
} from "../data/editions";
import { CertificateOfAuthenticityModal } from "../components/CertificateOfAuthenticityModal";
import { useAuth } from "../context/AuthContext";

export function Editions() {
  const { user } = useAuth();
  const [editions, setEditions] = useState<DigitalEdition[]>(() => getStoredEditions());
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCertData, setActiveCertData] = useState<{
    edition: DigitalEdition;
    ownership: any;
  } | null>(null);
  const [selectedEditionForPurchase, setSelectedEditionForPurchase] =
    useState<DigitalEdition | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<"GBP" | "ETH" | "USDT" | "SOL">("GBP");

  // Featured Hero drop (first featured or first edition)
  const featured = useMemo(() => {
    return editions.find((e) => e.featured) || editions[0];
  }, [editions]);

  // Filtered list
  const filteredEditions = useMemo(() => {
    return editions.filter((e) => {
      const matchesTier =
        selectedTier === "all" ||
        (selectedTier === "genesis" && e.tier === "genesis_1_of_1") ||
        (selectedTier === "series" && e.tier === "limited_series") ||
        (selectedTier === "physical" && e.hasPhysicalTwin);

      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.photographerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.camera.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTier && matchesSearch;
    });
  }, [editions, selectedTier, searchQuery]);

  const handleQuickPurchase = (edition: DigitalEdition) => {
    setSelectedEditionForPurchase(edition);
  };

  const confirmPurchase = () => {
    if (!selectedEditionForPurchase) return;
    try {
      setPurchasing(true);
      const buyerName = user?.name || "Private Collector";
      const buyerId = user?.id || "guest-collector";
      const buyerEmail = user?.email;

      const res = purchaseEdition(
        selectedEditionForPurchase.id,
        { id: buyerId, name: buyerName, email: buyerEmail },
        paymentCurrency,
      );

      if (res.success && res.ownership) {
        toast.success(
          `Congratulations! You have acquired ${selectedEditionForPurchase.title} (${res.ownership.serialDisplay})`,
        );
        setEditions(getStoredEditions());
        setSelectedEditionForPurchase(null);
        // Show certificate
        setActiveCertData({
          edition: selectedEditionForPurchase,
          ownership: res.ownership,
        });
      } else {
        toast.error(res.error || "Purchase could not be completed.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Transaction failed");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1714] text-[#FAF9F5] selection:bg-[#d4af37] selection:text-[#0d1714]">
      {/* Top Gallery Banner */}
      <div className="border-b border-white/10 bg-[#12231f]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="font-mono text-white/70 uppercase tracking-widest text-[10px]">
              NS CAPTURES CURATED EDITIONS ROOM
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/60 text-[11px] font-mono">
            <span>PLATFORM-CERTIFIED PROVENANCE</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">10% SECONDARY CREATOR ROYALTIES</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 space-y-16">
        {/* Hero Curated Spotlight */}
        {featured && (
          <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-[#162c26] to-[#0f1d19] p-6 sm:p-10 lg:p-12 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Image Frame */}
              <div className="lg:col-span-7 relative group">
                <div className="p-3 sm:p-4 bg-white/5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="size-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Badge Overlay */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[#d4af37] text-[11px] font-mono font-semibold uppercase tracking-wider">
                        <Sparkles className="size-3" />
                        {featured.tier === "genesis_1_of_1" ? "Genesis 1 of 1" : "Curated Series"}
                      </span>
                      {featured.hasPhysicalTwin && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono">
                          + Physical Print Twin
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-white/80">
                      <span>
                        {featured.camera} • {featured.lens}
                      </span>
                      <span>{featured.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Artwork Details & Curation Note */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-[#d4af37] uppercase tracking-widest font-semibold">
                    <Award className="size-4" />
                    <span>Curator's Spotlight Drop</span>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.08] text-white">
                    {featured.title}
                  </h1>
                  <p className="text-white/60 text-sm leading-relaxed font-serif">
                    {featured.description}
                  </p>
                </div>

                {/* Artist Info */}
                <div className="flex items-center gap-3 py-3 border-y border-white/10">
                  {featured.photographerAvatar ? (
                    <img
                      src={featured.photographerAvatar}
                      alt={featured.photographerName}
                      className="size-11 rounded-full object-cover border border-[#d4af37]/40"
                    />
                  ) : (
                    <div className="size-11 rounded-full bg-[#1e4a3f] flex items-center justify-center font-mono text-xs font-bold text-white">
                      {featured.photographerName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                      Photographer / Master Artist
                    </span>
                    <span className="font-serif text-base text-white font-medium">
                      {featured.photographerName}
                    </span>
                  </div>
                </div>

                {/* Scarcity & Pricing Pill */}
                <div className="flex items-end justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                      Availability
                    </span>
                    <span className="text-sm font-mono text-[#d4af37] font-semibold">
                      {featured.availableEditions} of {featured.totalEditions} Available
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                      Current Valuation
                    </span>
                    <span className="font-serif text-2xl text-white font-semibold">
                      £{featured.priceGbp.toLocaleString("en-GB")}
                    </span>
                    <span className="text-[10px] font-mono text-white/50 block">
                      ≈ {featured.priceEth} ETH • {featured.priceSol} SOL
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => handleQuickPurchase(featured)}
                    disabled={featured.availableEditions === 0}
                    className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium text-sm transition shadow-lg ${
                      featured.availableEditions === 0
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : "bg-[#d4af37] text-[#0d1714] hover:bg-[#e6c158] font-semibold"
                    }`}
                  >
                    <ShoppingBag className="size-4" />
                    <span>
                      {featured.availableEditions === 0 ? "Sold Out" : "Acquire Digital Edition"}
                    </span>
                  </button>

                  <Link
                    to={`/photo/${featured.photoId}`}
                    className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15 transition"
                  >
                    <span>Inspect Master</span>
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Catalog Section */}
        <div className="space-y-8">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <p className="font-mono text-xs text-[#d4af37] uppercase tracking-[0.2em] font-semibold">
                CURATED INVENTORY
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-white mt-1">
                Fine-Art Digital Editions
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Singular Genesis originals and strictly numbered photographic masterworks.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Works" },
                { id: "genesis", label: "Genesis 1/1s" },
                { id: "series", label: "Numbered Series" },
                { id: "physical", label: "Physical Twins" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition border ${
                    selectedTier === t.id
                      ? "bg-white text-[#0d1714] font-semibold border-white"
                      : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 size-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by artist, camera model, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEditions.map((item) => {
              const isSoldOut = item.availableEditions === 0;
              return (
                <div
                  key={item.id}
                  className="group rounded-2xl overflow-hidden bg-[#12231f] border border-white/10 hover:border-white/25 transition duration-300 flex flex-col shadow-lg"
                >
                  {/* Image Container with Simulated Fine-Art Matting */}
                  <div className="p-3 bg-black/20">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/40">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="size-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      {/* Scarcity badge */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[#d4af37] text-[10px] font-mono uppercase font-semibold border border-white/15">
                          {item.tier === "genesis_1_of_1"
                            ? "Genesis 1/1"
                            : `${item.availableEditions}/${item.totalEditions} Available`}
                        </span>
                      </div>

                      {item.hasPhysicalTwin && (
                        <div className="absolute bottom-3 left-3">
                          <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur text-[10px] font-mono text-white">
                            + Hahnemühle Print
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-white/50 font-mono">
                        <span>{item.tokenId}</span>
                        <span>{item.yearCreated}</span>
                      </div>
                      <h3 className="font-serif text-lg text-white font-medium group-hover:text-[#d4af37] transition truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/60 line-clamp-2 font-serif">
                        {item.description}
                      </p>
                    </div>

                    {/* Technical EXIF pill */}
                    <div className="py-2 px-3 bg-white/5 rounded-lg border border-white/5 text-[11px] font-mono text-white/60 flex items-center justify-between">
                      <span className="truncate">{item.camera}</span>
                      <span className="shrink-0">{item.lens}</span>
                    </div>

                    {/* Pricing & Footer */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">
                          Edition Price
                        </span>
                        <span className="font-serif text-lg font-semibold text-white">
                          £{item.priceGbp.toLocaleString("en-GB")}
                        </span>
                        <span className="text-[10px] font-mono text-white/50 block">
                          ≈ {item.priceEth} ETH
                        </span>
                      </div>

                      <button
                        onClick={() => handleQuickPurchase(item)}
                        disabled={isSoldOut}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                          isSoldOut
                            ? "bg-white/10 text-white/40 cursor-not-allowed"
                            : "bg-[#d4af37] text-[#0d1714] hover:bg-[#e6c158]"
                        }`}
                      >
                        <ShoppingBag className="size-3.5" />
                        <span>{isSoldOut ? "Sold Out" : "Acquire"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checkout / Acquisition Drawer */}
      {selectedEditionForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#142621] border border-white/20 rounded-2xl text-white p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#d4af37] tracking-widest font-semibold">
                  CONFIRM ART ACQUISITION
                </span>
                <h3 className="font-serif text-xl text-white mt-0.5">
                  {selectedEditionForPurchase.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEditionForPurchase(null)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                X
              </button>
            </div>

            {/* Overview */}
            <div className="flex gap-4 items-center p-3.5 bg-white/5 rounded-xl border border-white/10">
              <img
                src={selectedEditionForPurchase.image}
                alt={selectedEditionForPurchase.title}
                className="size-16 object-cover rounded-lg"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-serif text-sm font-semibold text-white truncate">
                  {selectedEditionForPurchase.title}
                </p>
                <p className="text-xs text-white/60">
                  By {selectedEditionForPurchase.photographerName}
                </p>
                <span className="text-[10px] font-mono text-[#d4af37] block">
                  Next Available Serial: #
                  {String(
                    selectedEditionForPurchase.totalEditions -
                      selectedEditionForPurchase.availableEditions +
                      1,
                  ).padStart(2, "0")}{" "}
                  / {selectedEditionForPurchase.totalEditions}
                </span>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-white/70 block">
                Settlement Currency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["GBP", "ETH", "USDT", "SOL"] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setPaymentCurrency(curr)}
                    className={`py-2 rounded-lg text-xs font-mono transition border ${
                      paymentCurrency === curr
                        ? "bg-[#d4af37] text-[#0d1714] font-bold border-[#d4af37]"
                        : "bg-white/5 text-white/80 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-white/70">
                <span>Master Artwork Price:</span>
                <span>£{selectedEditionForPurchase.priceGbp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Platform Mint & Certification:</span>
                <span className="text-[#10b981]">INCLUDED (£0.00)</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Creator Royalty Cut (10%):</span>
                <span>£{(selectedEditionForPurchase.priceGbp * 0.1).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm text-white">
                <span>Total Due:</span>
                <span className="text-[#d4af37]">
                  {paymentCurrency === "GBP" &&
                    `£${selectedEditionForPurchase.priceGbp.toLocaleString("en-GB")}`}
                  {paymentCurrency === "ETH" && `${selectedEditionForPurchase.priceEth} ETH`}
                  {paymentCurrency === "USDT" &&
                    `${(selectedEditionForPurchase.priceGbp * 1.28).toFixed(2)} USDT`}
                  {paymentCurrency === "SOL" && `${selectedEditionForPurchase.priceSol} SOL`}
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEditionForPurchase(null)}
                className="flex-1 py-3 rounded-xl text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing}
                className="flex-1 py-3 rounded-xl text-xs font-mono font-bold bg-[#d4af37] text-[#0d1714] hover:bg-[#e6c158] transition shadow-lg"
              >
                {purchasing ? "Issuing Provenance..." : "Confirm & Receive COA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {activeCertData && (
        <CertificateOfAuthenticityModal
          edition={activeCertData.edition}
          ownership={activeCertData.ownership}
          onClose={() => setActiveCertData(null)}
        />
      )}
    </div>
  );
}
