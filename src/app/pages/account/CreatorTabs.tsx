import { useState, useEffect, useRef } from "react";
import {
  Wallet,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  Camera,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import exifr from "exifr";
import { Eyebrow, Badge } from "../../components/ui";
import { type Orientation, type Photographer, type Brief } from "../../data/photos";
import {
  fetchPhotos,
  fetchBriefs,
  fetchPhotographers,
  fetchPhotographerStats,
  fetchPhotographerMonthlyRevenue,
  fetchPhotographerWeeklyDownloads,
  fetchFollowerCount,
  fetchBalanceAdjustments,
  fetchPayouts,
  fetchPayoutRequests,
  fetchPaymentMethods,
  upsertPaymentMethod,
  createPayoutRequest,
  deletePhoto,
  updatePhotoPrice,
  createPhoto,
  type Payout,
  type PayoutRequest,
  type PhotographerPaymentMethod,
  type CryptoWalletEntry,
  type Photo,
  getOptimizedImageUrl,
} from "../../data/db";
import { getStagedPhotos, type StagedPhoto } from "../../../lib/staging";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

// We only need nav for types or internal checks if any, but active is passed in.

const COINS = [
  { symbol: "BTC", name: "Bitcoin", networks: ["Bitcoin", "Lightning"] },
  { symbol: "ETH", name: "Ethereum", networks: ["ERC20", "Arbitrum", "Optimism", "Base"] },
  {
    symbol: "USDT",
    name: "Tether",
    networks: ["ERC20", "TRC20", "BEP20", "Solana", "Polygon", "Avalanche C"],
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    networks: ["ERC20", "TRC20", "BEP20", "Solana", "Polygon", "Avalanche C", "Base"],
  },
  { symbol: "SOL", name: "Solana", networks: ["Solana"] },
  { symbol: "LTC", name: "Litecoin", networks: ["Litecoin"] },
  { symbol: "XRP", name: "Ripple", networks: ["XRP Ledger"] },
  { symbol: "BCH", name: "Bitcoin Cash", networks: ["Bitcoin Cash"] },
  { symbol: "BNB", name: "BNB", networks: ["BEP20", "BEP2"] },
  { symbol: "MATIC", name: "Polygon", networks: ["Polygon"] },
  { symbol: "AVAX", name: "Avalanche", networks: ["Avalanche C", "Avalanche X"] },
  { symbol: "TRX", name: "Tron", networks: ["TRC20"] },
  { symbol: "ADA", name: "Cardano", networks: ["Cardano"] },
  { symbol: "DOT", name: "Polkadot", networks: ["Polkadot"] },
  { symbol: "DOGE", name: "Dogecoin", networks: ["Dogecoin"] },
  { symbol: "DAI", name: "Dai", networks: ["ERC20", "Polygon", "Optimism"] },
];

const CustomTooltip = ({ active, payload, label, prefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#12231f]/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="font-mono text-[9px] tracking-wider text-white/50">{label}</p>
        <p className="mt-1 font-serif text-sm font-semibold">
          {prefix}
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function CreatorTabs({
  active,
  onTabChange,
}: {
  active: string;
  onTabChange?: (tab: string) => void;
}) {
  const { user } = useAuth();

  // Supabase data
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);

  useEffect(() => {
    Promise.all([
      fetchPhotos().catch(() => {
        toast.error("An error occurred");
        return null;
      }),
      fetchBriefs().catch(() => {
        toast.error("An error occurred");
        return null;
      }),
      fetchPhotographers().catch(() => {
        toast.error("An error occurred");
        return null;
      }),
    ]).then(([photos, briefs, photographers]) => {
      if (photos) setPhotos(photos);
      if (briefs) setBriefs(briefs);
      if (photographers) setPhotographers(photographers);
    });
  }, []);

  // Payouts from DB
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [balanceAdjustments, setBalanceAdjustments] = useState<
    { amount: number; balanceAfter: number; reason: string | null; createdAt: string }[]
  >([]);
  const [paymentMethods, setPaymentMethods] = useState<PhotographerPaymentMethod[]>([]);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWalletEntry[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"card" | "crypto" | "paypal">("card");
  const [payoutDetails, setPayoutDetails] = useState<Record<string, string>>({});

  // Photographer dashboard data
  const [revenueData, setRevenueData] = useState<{ m: string; v: number }[]>([]);
  const [downloadsData, setDownloadsData] = useState<{ m: string; v: number }[]>([]);
  const [photographerStats, setPhotographerStats] = useState<{
    totalRevenue: number;
    totalDownloads: number;
    totalViews: number;
    totalLikes: number;
    photoCount: number;
    avgPrice: number;
  }>({
    totalRevenue: 0,
    totalDownloads: 0,
    totalViews: 0,
    totalLikes: 0,
    photoCount: 0,
    avgPrice: 0,
  });
  const [followerCount, setFollowerCount] = useState(0);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  // Dynamically resolve the photographerId and photographerProfile
  const photographerProfile = photographers.find((p) => p.id === user?.slug);
  const photographerId = user?.slug || photographerProfile?.id || "";

  // Dynamic Portfolio state (starts with this photographer's photos)
  const [portfolioPhotos, setPortfolioPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    if (photographerId) {
      setPortfolioPhotos(photos.filter((p) => p.photographerId === photographerId));
      fetchPayouts(photographerId)
        .then(setPayouts)
        .catch(() => {
          toast.error("An error occurred");
          return null;
        });
      fetchPayoutRequests(photographerId)
        .then(setPayoutRequests)
        .catch(() => {});
      fetchPaymentMethods(photographerId)
        .then((methods) => {
          setPaymentMethods(methods);
          const crypto = methods.find((m) => m.method === "crypto");
          if (crypto?.details?.wallets) {
            setCryptoWallets(crypto.details.wallets as CryptoWalletEntry[]);
          }
        })
        .catch(() => {});
      if (user?.id) {
        fetchBalanceAdjustments(user.id)
          .then(setBalanceAdjustments)
          .catch(() => {});
      }
      fetchPhotographerMonthlyRevenue(photographerId)
        .then(setRevenueData)
        .catch(() => {
          toast.error("An error occurred");
          return null;
        });
      fetchPhotographerWeeklyDownloads(photographerId)
        .then(setDownloadsData)
        .catch(() => {
          toast.error("An error occurred");
          return null;
        });
      fetchPhotographerStats(photographerId)
        .then(setPhotographerStats)
        .catch(() => {
          toast.error("An error occurred");
          return null;
        });
      fetchFollowerCount(photographerId)
        .then(setFollowerCount)
        .catch(() => {
          toast.error("An error occurred");
          return null;
        });
    }
  }, [photographerId, photos]);

  // Upload wizard states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Staged photos (browser IndexedDB)
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);

  // Refs for cleanup
  const objectUrlRef = useRef<string | null>(null);

  const clearPendingUploadWork = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPendingUploadWork();
    };
  }, []);

  // Load staged photos on mount
  useEffect(() => {
    getStagedPhotos()
      .then(setStagedPhotos)
      .catch(() => {});
  }, []);

  // Form states for upload metadata
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Portrait");
  const [uploadLocation, setUploadLocation] = useState("");
  const [uploadPrice, setUploadPrice] = useState("1000");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>("");
  const [uploadCamera, setUploadCamera] = useState("");
  const [uploadLens, setUploadLens] = useState("");
  const [uploadIso, setUploadIso] = useState(0);
  const [exifFocalLength, setExifFocalLength] = useState("");
  const [exifAperture, setExifAperture] = useState("");
  const [exifShutterSpeed, setExifShutterSpeed] = useState("");
  const [uploadOrientation, setUploadOrientation] = useState<Orientation>("portrait");
  const [uploadRatio, setUploadRatio] = useState("aspect-[4/5]");
  const [uploadColor, setUploadColor] = useState("#9a6b3f");

  const handleDeletePhoto = async (id: string) => {
    const ok = await deletePhoto(id);
    if (ok) {
      setPortfolioPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.error("Photo removed", {
        description: "The asset was successfully deleted from your public archive.",
      });
    } else {
      toast.error("Failed to delete photo", {
        description: "Could not remove the asset from the database.",
      });
    }
  };

  const handlePriceUpdate = async (photoId: string) => {
    const newPrice = parseInt(editingPriceValue, 10);
    if (isNaN(newPrice) || newPrice < 1000) {
      toast.error("Minimum price is £1,000");
      return;
    }
    const ok = await updatePhotoPrice(photoId, newPrice);
    if (ok) {
      setPortfolioPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, price: newPrice } : p)),
      );
      toast.success(`Price updated to £${newPrice.toLocaleString()}`);
    } else {
      toast.error("Failed to update price");
    }
    setEditingPriceId(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const analyzeImage = (
    file: File,
  ): Promise<{ ratio: string; orientation: Orientation; color: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const ratioVal = width / height;

        let orientation: Orientation = "square";
        let ratio = "aspect-square";

        if (ratioVal > 1.25) {
          orientation = "landscape";
          if (ratioVal > 1.55) {
            ratio = "aspect-[16/9]";
          } else {
            ratio = "aspect-[3/2]";
          }
        } else if (ratioVal < 0.8) {
          orientation = "portrait";
          if (ratioVal < 0.6) {
            ratio = "aspect-[9/16]";
          } else {
            ratio = "aspect-[4/5]";
          }
        }

        let color = "#9a6b3f";
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            color = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          }
        } catch (err) {
          console.error("Failed to extract color", err);
        }

        URL.revokeObjectURL(objectUrl);
        resolve({ ratio, orientation, color });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ ratio: "aspect-[4/5]", orientation: "portrait", color: "#9a6b3f" });
      };
    });
  };

  const processFile = async (file: File) => {
    clearPendingUploadWork();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setUploadFile(file);
    setUploadFileName(file.name);
    setUploadProgress(0);
    setUploadStep(1);

    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setUploadPreviewUrl(previewUrl);

    // Analyze dimensions, aspect ratio, orientation and dominant color dynamically
    analyzeImage(file).then(({ ratio, orientation, color }) => {
      setUploadRatio(ratio);
      setUploadOrientation(orientation);
      setUploadColor(color);
    });

    // Extract EXIF data from the file
    let exifData = {
      camera: "",
      lens: "",
      iso: 0,
      focalLength: "",
      aperture: "",
      shutterSpeed: "",
      location: "",
    };
    try {
      const exif = await exifr.parse(file, true);
      if (exif) {
        exifData = {
          camera: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}` : exif.Make || "",
          lens: exif.LensModel || exif.LensMake || "",
          iso: exif.ISO || 0,
          focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : "",
          aperture: exif.FNumber ? `f/${exif.FNumber}` : "",
          shutterSpeed: exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : "",
          location: exif.GPSLatitude
            ? `${exif.GPSLatitude.toFixed(4)}°, ${exif.GPSLongitude.toFixed(4)}°`
            : "",
        };
      }
    } catch {
      // EXIF extraction failed, continue without it
    }

    // Auto-fill metadata from EXIF
    if (exifData.camera) setUploadCamera(exifData.camera);
    if (exifData.lens) setUploadLens(exifData.lens);
    if (exifData.iso) setUploadIso(exifData.iso);
    if (exifData.focalLength) setExifFocalLength(exifData.focalLength);
    if (exifData.aperture) setExifAperture(exifData.aperture);
    if (exifData.shutterSpeed) setExifShutterSpeed(exifData.shutterSpeed);
    if (exifData.location) setUploadLocation(exifData.location);
    // Generate title from filename
    const nameFromFilename = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]/g, " ")
      .trim();
    if (nameFromFilename) setUploadTitle(nameFromFilename);

    // File is now staged locally — no Cloudinary upload yet
    setUploadProgress(100);
    setUploadStep(2);
  };

  // Upload to Cloudinary and return the URL
  const uploadToCloudinary = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        reject(new Error("Cloudinary not configured"));
        return;
      }

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const xhr = new XMLHttpRequest();
      const fd = new FormData();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.secure_url);
            } catch {
              reject(new Error("Invalid Cloudinary response"));
            }
          } else {
            let msg = "Cloudinary upload failed.";
            try {
              const err = JSON.parse(xhr.responseText);
              if (err?.error?.message) msg += " " + err.error.message;
            } catch {
              /* ignore parse error */
            }
            reject(new Error(msg));
          }
        }
      };

      fd.append("upload_preset", uploadPreset);
      fd.append("file", file);
      xhr.open("POST", url, true);
      xhr.send(fd);
    });
  };

  // Publish: upload to Cloudinary + create DB record
  const handlePublishPhoto = async (status: "published" | "draft" = "published") => {
    if (!uploadFile) {
      toast.error("No file selected");
      return;
    }

    setUploadStep(3);
    setUploadProgress(0);

    try {
      const imageUrl = await uploadToCloudinary(uploadFile);

      const newPhotoItem: Photo = {
        id: "upload-" + Date.now(),
        title: uploadTitle || "Untitled Frame",
        photographerId: photographerId,
        photographer: user?.name || "Unknown Photographer",
        license: "COMMERCIAL",
        category: uploadCategory,
        location: uploadLocation || "",
        color: uploadColor,
        orientation: uploadOrientation,
        ratio: uploadRatio,
        price: Math.max(Number(uploadPrice) || 1000, 1000),
        downloads: 0,
        views: 0,
        likes: 0,
        camera: uploadCamera || "",
        lens: uploadLens || "",
        iso: uploadIso || 0,
        keywords: [uploadCategory.toLowerCase(), "new-release"],
        image: imageUrl,
        aperture: exifAperture || undefined,
        shutterSpeed: exifShutterSpeed || undefined,
        focalLength: exifFocalLength || undefined,
      };

      const saved = await createPhoto(newPhotoItem);
      if (saved) {
        setPortfolioPhotos((prev) => [saved, ...prev]);
        toast.success(status === "draft" ? "Draft saved!" : "Photo published!", {
          description: `"${uploadTitle || "Untitled Frame"}" is now ${status === "draft" ? "saved as draft" : "visible under your portfolio"}.`,
        });
      } else {
        toast.error("Failed to save photo", {
          description: "The upload could not be saved. Check your connection and try again.",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadStep(2);
    }
  };

  const resetUploadWizard = () => {
    clearPendingUploadWork();
    setUploadTitle("");
    setUploadCategory("Portrait");
    setUploadLocation("");
    setUploadPrice("1000");
    setUploadFileName("");
    setUploadProgress(0);
    setUploadFile(null);
    setUploadPreviewUrl("");
    setUploadStep(1);
    setUploadOpen(false);
    setUploadCamera("");
    setUploadLens("");
    setUploadIso(0);
    setExifFocalLength("");
    setExifAperture("");
    setExifShutterSpeed("");
    setUploadOrientation("portrait");
    setUploadRatio("aspect-[4/5]");
    setUploadColor("#9a6b3f");
  };

  const payoutsToRender = [
    ...payouts.map((p) => ({
      id: p.id,
      date: p.date,
      method: p.method,
      amount: `£${p.amount.toLocaleString()}`,
      status: p.status,
    })),
    ...payoutRequests.map((r) => ({
      id: r.id,
      date: new Date(r.requestedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      method: r.method,
      amount: `£${r.amount.toLocaleString()}`,
      status: r.status,
    })),
  ];

  const stats = [
    {
      label: "REVENUE (LIFETIME)",
      value: `£${photographerStats.totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`,
    },
    { label: "DOWNLOADS", value: photographerStats.totalDownloads.toLocaleString() },
    { label: "LIKES", value: photographerStats.totalLikes.toLocaleString() },
    {
      label: "FOLLOWERS",
      value: Math.max(
        followerCount,
        photographerProfile?.customFollowers
          ? parseInt(photographerProfile.customFollowers.replace(/[^0-9]/g, ""), 10) || 0
          : 0,
      ).toLocaleString(),
    },
  ];

  const pendingPayoutRequest = payoutRequests.find((r) => r.status === "PENDING");
  const pendingPayout = pendingPayoutRequest
    ? {
        amount: pendingPayoutRequest.amount,
        date: new Date(pendingPayoutRequest.requestedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      }
    : payouts.find((p) => p.status === "PENDING");
  const successfulPayouts = payouts.filter((p) => p.status === "SUCCESSFUL");
  const lastPayout = successfulPayouts[0];

  return (
    <>
      {active === "dashboard" && (
        <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
          <div className="mx-auto flex max-w-[1440px] gap-8 px-5 sm:px-8 lg:px-12">
            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Eyebrow>PHOTOGRAPHER DASHBOARD</Eyebrow>
                  <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">
                    {(() => {
                      const h = new Date().getHours();
                      return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${user?.name?.split(" ")[0] || "Photographer"}.`;
                    })()}
                  </h1>
                </div>
                <button
                  onClick={() => {
                    setUploadStep(1);
                    setUploadOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[#1e4a3f] hover:bg-[#123b31] px-5 py-2.5 text-sm font-semibold text-white rounded-full ns-shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  <Upload className="size-4" /> Upload work
                </button>
              </div>

              {/* 1. OVERVIEW VIEW */}
              <div className="space-y-6 mt-8">
                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm ns-lift hover:border-[#1e4a3f]/20 hover:shadow-md transition-all duration-300"
                    >
                      <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                        {s.label}
                      </p>
                      <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="font-serif text-lg text-[#18211f]">Revenue</h3>
                      <Badge>2026</Badge>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e4a3f" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#1e4a3f" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                        <XAxis
                          dataKey="m"
                          tick={{ fontSize: 11, fill: "#8a8f89" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#8a8f89" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={<CustomTooltip prefix="£" />}
                          cursor={{ stroke: "#1e4a3f", strokeWidth: 1 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="#1e4a3f"
                          strokeWidth={2.5}
                          fill="url(#rev)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                    <h3 className="mb-6 font-serif text-lg text-[#18211f]">Downloads this week</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={downloadsData}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e4a3f" />
                            <stop offset="100%" stopColor="#2e6a5b" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                        <XAxis
                          dataKey="m"
                          tick={{ fontSize: 11, fill: "#8a8f89" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#8a8f89" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "#f0f2eb", opacity: 0.5 }}
                        />
                        <Bar
                          dataKey="v"
                          fill="url(#barGrad)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top performing + requests */}
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                  <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                    <h3 className="mb-4 font-serif text-lg text-[#18211f]">Top performing</h3>
                    <div className="space-y-2">
                      {portfolioPhotos
                        .filter((p) => p.photographerId === photographerId)
                        .sort(
                          (a, b) =>
                            Math.max(b.downloads || 0, b.customDownloads || 0) -
                            Math.max(a.downloads || 0, a.customDownloads || 0),
                        )
                        .slice(0, 4)
                        .map((p, i) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-4 hover:bg-[#FAF9F5] p-2.5 -mx-2.5 rounded-xl transition-all duration-200 group"
                          >
                            <span className="font-mono text-xs text-[#8a8f89]">0{i + 1}</span>
                            <img
                              src={getOptimizedImageUrl(p.image, 100)}
                              alt=""
                              loading="lazy"
                              className="size-12 object-cover rounded-lg group-hover:scale-[1.03] transition-all duration-200 shadow-sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#18211f]">
                                {p.title}
                              </p>
                              <p className="text-xs text-[#6b716d]">
                                {Math.max(
                                  p.downloads || 0,
                                  p.customDownloads || 0,
                                ).toLocaleString()}{" "}
                                downloads
                              </p>
                            </div>
                            <span className="font-serif text-base text-[#1e4a3f] font-semibold">
                              £
                              {(
                                (Math.max(p.downloads || 0, p.customDownloads || 0) * p.price) /
                                100
                              ).toFixed(0)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                    <h3 className="mb-4 font-serif text-lg text-[#18211f]">Incoming requests</h3>
                    <div className="space-y-3">
                      {briefs.map((b) => (
                        <div
                          key={b.id}
                          className="border-l-4 border-l-[#1e4a3f] border border-[#ececec]/60 rounded-xl bg-white p-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#18211f] truncate">
                              {b.title}
                            </p>
                            <Badge tone={b.status === "DELIVERED" ? "muted" : "green"}>
                              {b.status}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-[#6b716d] font-mono">
                            £{b.budget} · {b.delivery}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Picture Upload Wizard Modal */}
      {uploadOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm transition-opacity duration-300"
            onClick={resetUploadWizard}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#ececec] px-6 py-4">
                <div className="flex items-center gap-2">
                  <Camera className="size-5 text-[#1e4a3f]" />
                  <h2 className="font-serif text-lg font-semibold text-[#18211f]">
                    Upload new work
                  </h2>
                </div>
                <button
                  onClick={resetUploadWizard}
                  className="p-1 hover:bg-[#FAF9F5] rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-[#6b716d]" />
                </button>
              </div>

              {/* Steps indicators */}
              <div className="bg-[#FAF9F5] px-6 py-3 border-b border-[#ececec] flex items-center justify-between text-xs font-mono text-[#758078]">
                <div className="flex gap-4">
                  <span className={uploadStep === 1 ? "text-[#1e4a3f] font-bold" : "opacity-60"}>
                    1. FILE
                  </span>
                  <span>/</span>
                  <span className={uploadStep === 2 ? "text-[#1e4a3f] font-bold" : "opacity-60"}>
                    2. METADATA
                  </span>
                  <span>/</span>
                  <span className={uploadStep === 3 ? "text-[#1e4a3f] font-bold" : "opacity-60"}>
                    3. COMPLETE
                  </span>
                </div>
                <span>Step {uploadStep} of 3</span>
              </div>

              {/* Steps content */}
              <div className="flex-1 overflow-y-auto p-6">
                {uploadStep === 1 && (
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="file-upload-input"
                      onChange={handleFileSelect}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          document.getElementById("file-upload-input")?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleFileDrop}
                      onClick={() => document.getElementById("file-upload-input")?.click()}
                      className="border-2 border-dashed border-[#ececec] hover:border-[#1e4a3f]/40 bg-[#FAF9F5]/50 hover:bg-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-[#1e4a3f] rounded-2xl py-12 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group"
                    >
                      <div className="grid size-12 place-items-center rounded-full bg-[#dce8df]/60 text-[#1e4a3f] group-hover:scale-105 transition-transform duration-200 mb-3">
                        <Upload className="size-6" />
                      </div>
                      <p className="text-sm font-semibold text-[#18211f]">
                        Drag & drop camera RAW or High-Res JPEG
                      </p>
                      <p className="text-xs text-[#6b716d] mt-1">
                        File stays local until you publish — nothing uploaded yet
                      </p>
                      <span className="mt-4 inline-flex text-xs font-semibold text-[#1e4a3f] bg-[#dce8df] px-3.5 py-1.5 rounded-full">
                        Select local file
                      </span>
                    </div>
                    <div className="flex items-start gap-3 bg-[#FAF9F5] p-4 rounded-xl border border-[#ececec]/60">
                      <AlertCircle className="size-5 text-[#1e4a3f] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#18211f]">
                          Quality checklist for the Archive
                        </p>
                        <p className="text-[11px] text-[#6d746e] mt-1 leading-normal">
                          Only license single exposures. No compositing, digital canvas
                          manipulations, or synthetic AI generations (AI slop) allowed. Keep the
                          photograph honest.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadStep === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 bg-[#FAF9F5] p-3 rounded-xl border border-[#ececec]/60">
                      <img
                        src={uploadPreviewUrl}
                        alt="Preview"
                        loading="lazy"
                        className="size-16 object-cover rounded-lg shadow"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#18211f] truncate">
                          {uploadFileName}
                        </p>
                        <p className="text-[10px] text-[#758078] font-mono mt-0.5">
                          {uploadFile
                            ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB · ${uploadFile.type.split("/")[1]?.toUpperCase() || "Image"}`
                            : "Processing..."}
                        </p>
                        {uploadCamera || uploadLens ? (
                          <div className="flex gap-2 mt-1.5 font-mono text-[9px] text-[#1e7a4f] bg-[#dce8df] px-2 py-0.5 rounded-full w-fit font-bold">
                            <Check className="size-3" /> EXIF data extracted
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-1.5 font-mono text-[9px] text-[#758078] bg-[#ececec] px-2 py-0.5 rounded-full w-fit">
                            No EXIF data — fill fields manually
                          </div>
                        )}
                        <p className="text-[10px] text-[#758078] mt-1.5 font-mono">
                          Staged locally — not uploaded yet
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Photograph Title
                        </span>
                        <input
                          required
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="e.g. Bloom study, no. 12"
                          className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                        />
                      </label>

                      <div className="grid gap-4 grid-cols-2">
                        <label className="block">
                          <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                            Category
                          </span>
                          <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                            className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                          >
                            <option value="Portrait">Portrait</option>
                            <option value="Lifestyle">Lifestyle</option>
                            <option value="Fashion">Fashion</option>
                            <option value="Architecture">Architecture</option>
                            <option value="Culture">Culture</option>
                            <option value="Documentary">Documentary</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                            Single License price (£)
                          </span>
                          <input
                            required
                            type="number"
                            value={uploadPrice}
                            onChange={(e) => setUploadPrice(e.target.value)}
                            className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Shooting Location
                        </span>
                        <input
                          value={uploadLocation}
                          onChange={(e) => setUploadLocation(e.target.value)}
                          placeholder="e.g. Arizona, USA"
                          className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                        />
                      </label>

                      {/* EXIF Metadata Inputs */}
                      <div className="border border-[#ececec] bg-[#FAF9F5] rounded-xl p-4 space-y-4">
                        <p className="font-mono text-[9px] text-[#758078] uppercase tracking-wider">
                          EXIF Metadata (Photographer can fill/edit manually)
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                              Camera Body
                            </span>
                            <input
                              value={uploadCamera}
                              onChange={(e) => setUploadCamera(e.target.value)}
                              placeholder="e.g. Sony A7 IV"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                              Optics/Lens
                            </span>
                            <input
                              value={uploadLens}
                              onChange={(e) => setUploadLens(e.target.value)}
                              placeholder="e.g. 50mm f/1.2"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                              ISO Sensitivity
                            </span>
                            <input
                              type="number"
                              value={uploadIso || ""}
                              onChange={(e) => setUploadIso(Number(e.target.value))}
                              placeholder="e.g. 100"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                              Aperture
                            </span>
                            <input
                              value={exifAperture}
                              onChange={(e) => setExifAperture(e.target.value)}
                              placeholder="e.g. f/2.8"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                              Shutter Speed
                            </span>
                            <input
                              value={exifShutterSpeed}
                              onChange={(e) => setExifShutterSpeed(e.target.value)}
                              placeholder="e.g. 1/250s"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                              Focal Length
                            </span>
                            <input
                              value={exifFocalLength}
                              onChange={(e) => setExifFocalLength(e.target.value)}
                              placeholder="e.g. 85mm"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#ececec]">
                      <button
                        type="button"
                        onClick={resetUploadWizard}
                        className="text-xs font-semibold text-[#6b716d] hover:text-[#18211f] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handlePublishPhoto("draft")}
                          className="border border-[#ececec] hover:border-[#1e4a3f] text-[#4a534e] hover:text-[#1e4a3f] bg-white px-5 py-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePublishPhoto("published")}
                          className="bg-[#1e4a3f] hover:bg-[#123b31] px-6 py-2.5 text-sm font-semibold text-white rounded-full transition-all duration-200 cursor-pointer shadow-md"
                        >
                          Publish to Archive
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {uploadStep === 3 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <div className="relative">
                      {uploadProgress > 0 && uploadProgress < 100 ? (
                        <Loader2 className="size-16 text-[#1e4a3f] animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-16 text-[#1e7a4f] animate-bounce" />
                      )}
                    </div>
                    <div>
                      <p className="font-serif text-2xl text-[#18211f]">
                        {uploadProgress > 0 && uploadProgress < 100
                          ? "Uploading..."
                          : "Photograph Published"}
                      </p>
                      <p className="text-xs text-[#6d746e] mt-1.5 max-w-xs mx-auto">
                        {uploadProgress > 0 && uploadProgress < 100
                          ? "Your image is being uploaded to the archive..."
                          : "Your image has been published successfully. Our editors will review it for quality standards shortly."}
                      </p>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-48 bg-gray-200 rounded-full h-1.5 mt-3 mx-auto overflow-hidden">
                          <div
                            className="bg-[#1e4a3f] h-1.5 rounded-full transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {uploadProgress >= 100 && (
                      <div className="pt-6 flex gap-4 w-full justify-center">
                        <button
                          onClick={() => {
                            resetUploadWizard();
                            onTabChange?.("portfolio");
                          }}
                          className="bg-[#1e4a3f] hover:bg-[#123b31] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow transition-colors cursor-pointer"
                        >
                          View in Portfolio
                        </button>
                        <button
                          onClick={() => {
                            setUploadStep(1);
                            setUploadProgress(0);
                            setUploadFileName("");
                            setUploadTitle("");
                            setUploadFile(null);
                            setUploadPreviewUrl("");
                          }}
                          className="border border-[#ececec] hover:border-[#1e4a3f] text-[#4a534e] hover:text-[#1e4a3f] bg-white px-5 py-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Upload Another
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {active === "portfolio" && (
        <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <Eyebrow>PORTFOLIO</Eyebrow>
                <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">
                  Your Archive
                </h1>
                <p className="text-sm text-[#6b716d] mt-1">
                  {portfolioPhotos.length} photograph{portfolioPhotos.length !== 1 && "s"} published
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadStep(1);
                  setUploadOpen(true);
                }}
                className="flex items-center gap-2 bg-[#1e4a3f] hover:bg-[#123b31] px-5 py-2.5 text-sm font-semibold text-white rounded-full ns-shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <Upload className="size-4" /> Upload work
              </button>
            </div>

            {portfolioPhotos.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {portfolioPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group bg-white border border-[#ececec] rounded-2xl overflow-hidden ns-shadow-sm hover:border-[#1e4a3f]/20 hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={getOptimizedImageUrl(photo.image, 480)}
                        alt={photo.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-sm font-semibold text-[#18211f] truncate">
                        {photo.title}
                      </h3>
                      <p className="text-[11px] text-[#758078] mt-0.5 capitalize">
                        {photo.category} · {photo.orientation}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#ececec]/60">
                        {editingPriceId === photo.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#758078]">£</span>
                            <input
                              type="number"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handlePriceUpdate(photo.id);
                                if (e.key === "Escape") setEditingPriceId(null);
                              }}
                              autoFocus
                              className="w-20 text-sm font-semibold text-[#1e4a3f] border border-[#1e4a3f]/30 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#1e4a3f]/20"
                            />
                            <button
                              onClick={() => handlePriceUpdate(photo.id)}
                              className="p-1 text-[#1e4a3f] hover:bg-[#1e4a3f]/10 rounded cursor-pointer"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingPriceId(null)}
                              className="p-1 text-[#758078] hover:bg-[#ececec] rounded cursor-pointer"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPriceId(photo.id);
                              setEditingPriceValue(String(photo.price));
                            }}
                            className="font-serif text-sm font-semibold text-[#1e4a3f] hover:underline cursor-pointer"
                          >
                            £{photo.price.toLocaleString()}
                          </button>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-[#758078]">
                          <span>
                            {Math.max(photo.downloads || 0, photo.customDownloads || 0)} downloads
                          </span>
                          <span>{Math.max(photo.views || 0, photo.customViews || 0)} views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#ececec] rounded-2xl p-16 text-center">
                <Camera className="size-10 mx-auto text-[#c4cdc5]" />
                <p className="mt-3 font-serif text-lg text-[#4a534e]">No photos yet</p>
                <p className="text-xs text-[#758078] mt-1 max-w-xs mx-auto">
                  Upload your first photograph to start building your portfolio.
                </p>
                <button
                  onClick={() => {
                    setUploadStep(1);
                    setUploadOpen(true);
                  }}
                  className="mt-4 bg-[#1e4a3f] hover:bg-[#123b31] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow transition-colors cursor-pointer"
                >
                  Upload work
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {active === "payouts" && (
        <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <Eyebrow>PAYOUTS</Eyebrow>
            <h1 className="mt-2 mb-8 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">
              Earnings & Payouts
            </h1>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
              <div className="border border-[#ececec] bg-white rounded-2xl p-6 ns-shadow-sm">
                <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                  Available Balance
                </p>
                <p className="mt-2 font-serif text-3xl text-[#1e4a3f] font-semibold">
                  £
                  {(user?.payoutBalance ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#758078] mt-1.5">
                  Withdrawable after admin approval
                </p>
              </div>
              <div className="border border-[#ececec] bg-white rounded-2xl p-6 ns-shadow-sm">
                <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                  Lifetime Revenue
                </p>
                <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">
                  £
                  {photographerStats.totalRevenue.toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-[11px] text-[#758078] mt-1.5">Total earned from all sales</p>
              </div>
              <div className="border border-[#ececec] bg-white rounded-2xl p-6 ns-shadow-sm">
                <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                  Pending Payout
                </p>
                <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">
                  {pendingPayout ? `£${pendingPayout.amount.toLocaleString()}` : "—"}
                </p>
                <p className="text-[11px] text-[#758078] mt-1.5">
                  {pendingPayout ? `Requested ${pendingPayout.date}` : "No pending requests"}
                </p>
              </div>
            </div>

            {payoutsToRender.length > 0 ? (
              <div className="bg-white border border-[#ececec] rounded-2xl ns-shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ececec]">
                  <h2 className="font-serif text-lg text-[#18211f]">Payout History</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#ececec]">
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Method
                        </th>
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase text-right">
                          Amount
                        </th>
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutsToRender.map((p) => (
                        <tr key={p.id} className="border-b border-[#ececec]/50 last:border-0">
                          <td className="px-6 py-4 text-sm text-[#4a534e]">{p.date}</td>
                          <td className="px-6 py-4 text-sm text-[#4a534e] capitalize">
                            {p.method}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#18211f] font-medium text-right">
                            {p.amount}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                p.status === "SUCCESSFUL" ||
                                p.status === "PAID" ||
                                p.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : p.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {p.status === "SUCCESSFUL" ? "PAID" : p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#ececec] rounded-2xl ns-shadow-sm p-12 text-center">
                <Wallet className="size-10 mx-auto text-[#c4cdc5]" />
                <p className="mt-3 font-serif text-lg text-[#4a534e]">No payout history</p>
                <p className="text-xs text-[#758078] mt-1 max-w-xs mx-auto">
                  Once a payout is processed or you submit a withdrawal request, it will appear
                  here.
                </p>
              </div>
            )}

            {balanceAdjustments.length > 0 && (
              <div className="mt-8 bg-white border border-[#ececec] rounded-2xl ns-shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ececec]">
                  <h2 className="font-serif text-lg text-[#18211f]">Balance Adjustments</h2>
                  <p className="text-[11px] text-[#758078] mt-0.5">
                    Admin-ledger activity on your account
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#ececec]">
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                          Reason
                        </th>
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase text-right">
                          Amount
                        </th>
                        <th className="px-6 py-3 font-mono text-[9px] tracking-wider text-[#758078] uppercase text-right">
                          Balance After
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceAdjustments.map((adj, i) => (
                        <tr key={i} className="border-b border-[#ececec]/50 last:border-0">
                          <td className="px-6 py-4 text-sm text-[#4a534e]">
                            {new Date(adj.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#6b716d] max-w-[200px] truncate">
                            {adj.reason || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-right">
                            <span className={adj.amount >= 0 ? "text-emerald-700" : "text-red-600"}>
                              {adj.amount >= 0 ? "+" : ""}£
                              {adj.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#18211f] font-medium text-right">
                            £
                            {adj.balanceAfter.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="bg-white border border-[#ececec] rounded-2xl ns-shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ececec]">
                  <h2 className="font-serif text-lg text-[#18211f]">Payout Methods</h2>
                  <p className="text-[11px] text-[#758078] mt-0.5">
                    Configure how you receive your earnings
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  {/* Bank Transfer */}
                  <div className="border border-[#ececec] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-[#f5f5f5]">
                          <Wallet className="size-4 text-[#1e4a3f]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#18211f]">Bank Transfer</p>
                          <p className="text-[11px] text-[#758078]">
                            Receive payouts via bank wire
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingMethod(editingMethod === "card" ? null : "card")}
                        className="text-xs font-semibold text-[#1e4a3f] hover:underline"
                      >
                        {editingMethod === "card"
                          ? "Cancel"
                          : paymentMethods.find((m) => m.method === "card")?.details?.bankName
                            ? "Edit"
                            : "Configure"}
                      </button>
                    </div>
                    {paymentMethods.find((m) => m.method === "card")?.details?.bankName &&
                      editingMethod !== "card" && (
                        <div className="mt-1 pt-3 border-t border-[#ececec]/60 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge tone="green">Configured</Badge>
                          </div>
                          <p className="text-xs text-[#18211f] font-medium">
                            {
                              paymentMethods.find((m) => m.method === "card")?.details
                                ?.bankName as string
                            }
                          </p>
                          <p className="text-xs text-[#6b716d] font-mono">
                            {
                              paymentMethods.find((m) => m.method === "card")?.details
                                ?.accountNumber as string
                            }{" "}
                            {paymentMethods.find((m) => m.method === "card")?.details?.sortCode
                              ? `· ${paymentMethods.find((m) => m.method === "card")?.details?.sortCode}`
                              : ""}
                          </p>
                        </div>
                      )}
                    {editingMethod === "card" && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-[#ececec]/60">
                        <input
                          type="text"
                          placeholder="Bank name"
                          defaultValue={
                            (paymentMethods.find((m) => m.method === "card")?.details
                              ?.bankName as string) || ""
                          }
                          id="pm-bank-name"
                          className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                        />
                        <input
                          type="text"
                          placeholder="Account number / IBAN"
                          defaultValue={
                            (paymentMethods.find((m) => m.method === "card")?.details
                              ?.accountNumber as string) || ""
                          }
                          id="pm-bank-account"
                          className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                        />
                        <input
                          type="text"
                          placeholder="Sort code / SWIFT / BIC"
                          defaultValue={
                            (paymentMethods.find((m) => m.method === "card")?.details
                              ?.sortCode as string) || ""
                          }
                          id="pm-bank-sort"
                          className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                        />
                        <button
                          onClick={async () => {
                            const bankName = (
                              document.getElementById("pm-bank-name") as HTMLInputElement
                            )?.value;
                            const accountNumber = (
                              document.getElementById("pm-bank-account") as HTMLInputElement
                            )?.value;
                            const sortCode = (
                              document.getElementById("pm-bank-sort") as HTMLInputElement
                            )?.value;
                            if (!bankName || !accountNumber) {
                              toast.error("Fill in bank details");
                              return;
                            }
                            const ok = await upsertPaymentMethod(photographerId, "card", true, {
                              bankName,
                              accountNumber,
                              sortCode,
                            });
                            if (ok) {
                              toast.success("Bank details saved");
                              setEditingMethod(null);
                              const methods = await fetchPaymentMethods(photographerId);
                              setPaymentMethods(methods);
                            } else {
                              toast.error("Failed to save");
                            }
                          }}
                          className="w-full rounded-full bg-[#1e4a3f] py-2 text-xs font-semibold text-white hover:bg-[#123b31] transition"
                        >
                          Save Bank Details
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Crypto */}
                  <div className="border border-[#ececec] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-[#f5f5f5]">
                          <span className="text-sm font-bold text-[#1e4a3f]">₿</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#18211f]">Crypto Wallet</p>
                          <p className="text-[11px] text-[#758078]">
                            Receive payouts in cryptocurrency
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setEditingMethod(editingMethod === "crypto" ? null : "crypto")
                        }
                        className="text-xs font-semibold text-[#1e4a3f] hover:underline"
                      >
                        {editingMethod === "crypto"
                          ? "Cancel"
                          : paymentMethods.find((m) => m.method === "crypto")?.details?.wallets
                            ? "Edit"
                            : "Configure"}
                      </button>
                    </div>
                    {paymentMethods.find((m) => m.method === "crypto")?.details?.wallets &&
                      editingMethod !== "crypto" && (
                        <div className="mt-1 pt-3 border-t border-[#ececec]/60 space-y-2">
                          <Badge tone="green">Configured</Badge>
                          {(
                            paymentMethods.find((m) => m.method === "crypto")?.details
                              ?.wallets as any[]
                          )?.map((w: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-[#18211f]">{w.coin}</span>
                              <span className="text-[#758078]">({w.network})</span>
                              <span className="font-mono text-[#6b716d] truncate">{w.address}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    {editingMethod === "crypto" && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-[#ececec]/60">
                        {cryptoWallets.map((w, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <select
                              value={w.coin}
                              onChange={(e) => {
                                const next = [...cryptoWallets];
                                const coin = COINS.find((c) => c.symbol === e.target.value);
                                next[i] = {
                                  coin: e.target.value,
                                  network: coin?.networks[0] || "",
                                  address: w.address,
                                };
                                setCryptoWallets(next);
                              }}
                              className="text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f] w-28"
                            >
                              {COINS.map((c) => (
                                <option key={c.symbol} value={c.symbol}>
                                  {c.symbol}
                                </option>
                              ))}
                            </select>
                            <select
                              value={w.network}
                              onChange={(e) => {
                                const next = [...cryptoWallets];
                                next[i] = { ...next[i], network: e.target.value };
                                setCryptoWallets(next);
                              }}
                              className="text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f] flex-1"
                            >
                              {COINS.find((c) => c.symbol === w.coin)?.networks.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Wallet address"
                              value={w.address}
                              onChange={(e) => {
                                const next = [...cryptoWallets];
                                next[i] = { ...next[i], address: e.target.value };
                                setCryptoWallets(next);
                              }}
                              className="flex-1 text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                            />
                            <button
                              onClick={() =>
                                setCryptoWallets((prev) => prev.filter((_, j) => j !== i))
                              }
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setCryptoWallets((prev) => [
                              ...prev,
                              { coin: "BTC", network: "Bitcoin", address: "" },
                            ])
                          }
                          className="flex items-center gap-1 text-xs font-semibold text-[#1e4a3f] hover:underline"
                        >
                          <Plus className="size-3" /> Add wallet
                        </button>
                        <button
                          onClick={async () => {
                            const valid = cryptoWallets.filter((w) => w.address);
                            if (valid.length === 0) {
                              toast.error("Add at least one wallet address");
                              return;
                            }
                            const ok = await upsertPaymentMethod(photographerId, "crypto", true, {
                              wallets: valid,
                            });
                            if (ok) {
                              toast.success("Crypto wallets saved");
                              setEditingMethod(null);
                              const methods = await fetchPaymentMethods(photographerId);
                              setPaymentMethods(methods);
                            } else {
                              toast.error("Failed to save");
                            }
                          }}
                          className="w-full rounded-full bg-[#1e4a3f] py-2 text-xs font-semibold text-white hover:bg-[#123b31] transition"
                        >
                          Save Crypto Wallets
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PayPal */}
                  <div className="border border-[#ececec] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-lg bg-[#f5f5f5]">
                          <span className="text-sm font-bold text-[#1e4a3f]">P</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#18211f]">PayPal</p>
                          <p className="text-[11px] text-[#758078]">Receive payouts via PayPal</p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setEditingMethod(editingMethod === "paypal" ? null : "paypal")
                        }
                        className="text-xs font-semibold text-[#1e4a3f] hover:underline"
                      >
                        {editingMethod === "paypal"
                          ? "Cancel"
                          : paymentMethods.find((m) => m.method === "paypal")?.details?.email
                            ? "Edit"
                            : "Configure"}
                      </button>
                    </div>
                    {paymentMethods.find((m) => m.method === "paypal")?.details?.email &&
                      editingMethod !== "paypal" && (
                        <div className="mt-1 pt-3 border-t border-[#ececec]/60 space-y-1">
                          <Badge tone="green">Configured</Badge>
                          <p className="text-xs text-[#6b716d] font-mono">
                            {
                              paymentMethods.find((m) => m.method === "paypal")?.details
                                ?.email as string
                            }
                          </p>
                        </div>
                      )}
                    {editingMethod === "paypal" && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-[#ececec]/60">
                        <input
                          type="email"
                          placeholder="PayPal email"
                          defaultValue={
                            (paymentMethods.find((m) => m.method === "paypal")?.details
                              ?.email as string) || ""
                          }
                          id="pm-paypal-email"
                          className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                        />
                        <button
                          onClick={async () => {
                            const email = (
                              document.getElementById("pm-paypal-email") as HTMLInputElement
                            )?.value;
                            if (!email) {
                              toast.error("Enter PayPal email");
                              return;
                            }
                            const ok = await upsertPaymentMethod(photographerId, "paypal", true, {
                              email,
                            });
                            if (ok) {
                              toast.success("PayPal saved");
                              setEditingMethod(null);
                              const methods = await fetchPaymentMethods(photographerId);
                              setPaymentMethods(methods);
                            } else {
                              toast.error("Failed to save");
                            }
                          }}
                          className="w-full rounded-full bg-[#1e4a3f] py-2 text-xs font-semibold text-white hover:bg-[#123b31] transition"
                        >
                          Save PayPal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#ececec] rounded-2xl ns-shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ececec]">
                  <h2 className="font-serif text-lg text-[#18211f]">Request Payout</h2>
                  <p className="text-[11px] text-[#758078] mt-0.5">
                    Withdraw your available balance
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-[#f7f7f7] rounded-xl p-4 border border-[#ececec]">
                    <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                      Available Balance
                    </p>
                    <p className="mt-1 font-serif text-2xl text-[#1e4a3f] font-semibold">
                      £
                      {(user?.payoutBalance ?? 0).toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                      Amount (£)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="mt-2 w-full text-sm border border-[#ececec] rounded-xl px-4 py-3 outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
                      Payout Method
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["card", "crypto", "paypal"] as const).map((m) => {
                        const methodLabel =
                          m === "card" ? "Bank" : m === "crypto" ? "Crypto" : "PayPal";
                        const hasConfig =
                          paymentMethods.find((pm) => pm.method === m)?.details &&
                          (m === "card"
                            ? paymentMethods.find((pm) => pm.method === m)?.details?.bankName
                            : m === "crypto"
                              ? (
                                  paymentMethods.find((pm) => pm.method === m)?.details
                                    ?.wallets as any[]
                                )?.length > 0
                              : paymentMethods.find((pm) => pm.method === m)?.details?.email);
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              setPayoutMethod(m);
                              // Pre-fill from configured method
                              const saved = paymentMethods.find((pm) => pm.method === m);
                              if (saved?.details) {
                                const d = saved.details as Record<string, any>;
                                if (m === "card") {
                                  setPayoutDetails({
                                    bankName: d.bankName || "",
                                    accountNumber: d.accountNumber || "",
                                  });
                                } else if (m === "crypto") {
                                  const wallets = d.wallets as any[];
                                  const first = wallets?.[0];
                                  setPayoutDetails({
                                    coin: first?.coin || "BTC",
                                    address: first?.address || "",
                                  });
                                } else if (m === "paypal") {
                                  setPayoutDetails({ email: d.email || "" });
                                }
                              } else {
                                setPayoutDetails({});
                              }
                            }}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                              payoutMethod === m
                                ? "border-[#1e4a3f] bg-[#1e4a3f]/5 text-[#1e4a3f]"
                                : "border-[#ececec] text-[#6b716d] hover:border-[#1e4a3f]/30"
                            }`}
                          >
                            {methodLabel}
                            {hasConfig && (
                              <span className="ml-1 inline-block size-1.5 rounded-full bg-[#1e4a3f]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {payoutMethod === "card" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Bank name"
                        value={payoutDetails.bankName || ""}
                        onChange={(e) =>
                          setPayoutDetails((p) => ({ ...p, bankName: e.target.value }))
                        }
                        className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                      />
                      <input
                        type="text"
                        placeholder="Account number / IBAN"
                        value={payoutDetails.accountNumber || ""}
                        onChange={(e) =>
                          setPayoutDetails((p) => ({ ...p, accountNumber: e.target.value }))
                        }
                        className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                      />
                    </div>
                  )}
                  {payoutMethod === "crypto" && (
                    <div className="space-y-3">
                      <select
                        value={payoutDetails.coin || "BTC"}
                        onChange={(e) => {
                          const coin = COINS.find((c) => c.symbol === e.target.value);
                          setPayoutDetails((p) => ({
                            ...p,
                            coin: e.target.value,
                            network: coin?.networks[0] || "",
                          }));
                        }}
                        className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                      >
                        {COINS.map((c) => (
                          <option key={c.symbol} value={c.symbol}>
                            {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Wallet address"
                        value={payoutDetails.address || ""}
                        onChange={(e) =>
                          setPayoutDetails((p) => ({ ...p, address: e.target.value }))
                        }
                        className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                      />
                    </div>
                  )}
                  {payoutMethod === "paypal" && (
                    <input
                      type="email"
                      placeholder="PayPal email"
                      value={payoutDetails.email || ""}
                      onChange={(e) => setPayoutDetails((p) => ({ ...p, email: e.target.value }))}
                      className="w-full text-sm border border-[#ececec] rounded-lg px-3 py-2 outline-none focus:border-[#1e4a3f]"
                    />
                  )}
                  <button
                    onClick={async () => {
                      const amount = parseFloat(payoutAmount);
                      if (!amount || amount <= 0) {
                        toast.error("Enter a valid amount");
                        return;
                      }
                      if (amount > (user?.payoutBalance ?? 0)) {
                        toast.error("Amount exceeds available balance");
                        return;
                      }
                      if (
                        payoutMethod === "card" &&
                        (!payoutDetails.bankName || !payoutDetails.accountNumber)
                      ) {
                        toast.error("Fill in bank details");
                        return;
                      }
                      if (payoutMethod === "crypto" && !payoutDetails.address) {
                        toast.error("Enter wallet address");
                        return;
                      }
                      if (payoutMethod === "paypal" && !payoutDetails.email) {
                        toast.error("Enter PayPal email");
                        return;
                      }
                      const req = await createPayoutRequest(
                        photographerId,
                        amount,
                        payoutMethod,
                        payoutDetails,
                      );
                      if (req) {
                        toast.success("Payout request submitted");
                        setPayoutAmount("");
                        setPayoutDetails({});
                        fetchPayoutRequests(photographerId)
                          .then(setPayoutRequests)
                          .catch(() => {});
                      } else {
                        toast.error("Failed to submit request");
                      }
                    }}
                    className="w-full rounded-full bg-[#1e4a3f] py-2.5 text-sm font-semibold text-white hover:bg-[#123b31] transition"
                  >
                    Request Payout
                  </button>
                  <p className="text-[11px] text-[#758078] text-center">
                    Payouts are reviewed and processed by the admin team within 3-5 business days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
