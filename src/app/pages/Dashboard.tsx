import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  LayoutGrid, Image as ImageIcon, TrendingUp, Wallet, Users, Inbox, Settings, Upload,
  Plus, Trash2, Check, X, Camera, Aperture, AlertCircle, FileText, ChevronRight, Loader2, CheckCircle2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import exifr from "exifr";
import { Eyebrow, Badge } from "../components/ui";
import { SideNav } from "../components/SideNav";
import { photos as fallbackPhotos, briefs as fallbackBriefs, photographers as fallbackPhotographers, type Photo, type License, type Orientation } from "../data/photos";
import { fetchPhotos, fetchBriefs, fetchPhotographers, fetchPayouts, fetchPhotographerStats, fetchPhotographerMonthlyRevenue, fetchPhotographerWeeklyDownloads, fetchPhotographerTopCategories, fetchFollowerCount, updatePhotoPrice, createPhoto, fetchPhotographerProfileSettings, upsertPhotographerProfileSettings, type Payout, getOptimizedImageUrl } from "../data/db";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "portfolio", label: "Portfolio", icon: ImageIcon },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "payouts", label: "Payouts", icon: Wallet },
  { id: "followers", label: "Followers", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

const CustomTooltip = ({ active, payload, label, prefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#12231f]/95 p-3 text-white shadow-xl backdrop-blur-md">
        <p className="font-mono text-[9px] tracking-wider text-white/50">{label}</p>
        <p className="mt-1 font-serif text-sm font-semibold">
          {prefix}{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const active = nav.some((item) => item.id === requestedTab) ? requestedTab! : "overview";
  const setActive = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    setParams(next);
  };

  const { user } = useAuth();

  // Supabase data
  const [photos, setPhotos] = useState(fallbackPhotos);
  const [briefs, setBriefs] = useState(fallbackBriefs);
  const [photographers, setPhotographers] = useState(fallbackPhotographers);

  useEffect(() => {
    Promise.all([
      fetchPhotos().catch(() => {}),
      fetchBriefs().catch(() => {}),
      fetchPhotographers().catch(() => {}),
    ]).then(([photos, briefs, photographers]) => {
      if (photos) setPhotos(photos);
      if (briefs) setBriefs(briefs);
      if (photographers) setPhotographers(photographers);
    });
  }, []);

  // Payouts from DB
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  // Photographer dashboard data
  const [revenueData, setRevenueData] = useState<{ m: string; v: number }[]>([]);
  const [downloadsData, setDownloadsData] = useState<{ m: string; v: number }[]>([]);
  const [photographerStats, setPhotographerStats] = useState<{ totalRevenue: number; totalDownloads: number; totalViews: number; totalLikes: number; photoCount: number; avgPrice: number }>({ totalRevenue: 0, totalDownloads: 0, totalViews: 0, totalLikes: 0, photoCount: 0, avgPrice: 0 });
  const [topCategories, setTopCategories] = useState<{ name: string; pct: string }[]>([]);
  const [followerCount, setFollowerCount] = useState(0);

  // Dynamically resolve the photographerId and photographerProfile
  const photographerProfile = photographers.find(p => p.name.toLowerCase() === user?.name.toLowerCase());
  const photographerId = photographerProfile ? photographerProfile.id : user?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "";

  // Dynamic Portfolio state (starts with this photographer's photos)
  const [portfolioPhotos, setPortfolioPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    if (photographerId) {
      setPortfolioPhotos(photos.filter((p) => p.photographerId === photographerId));
      fetchPayouts(photographerId).then(setPayouts).catch(() => {});
      fetchPhotographerMonthlyRevenue(photographerId).then(setRevenueData).catch(() => {});
      fetchPhotographerWeeklyDownloads(photographerId).then(setDownloadsData).catch(() => {});
      fetchPhotographerStats(photographerId).then(setPhotographerStats).catch(() => {});
      fetchPhotographerTopCategories(photographerId).then(setTopCategories).catch(() => {});
      fetchFollowerCount(photographerId).then(setFollowerCount).catch(() => {});
    }
  }, [photographerId]);

  // Upload wizard states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs for cleanup
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingUploadWork = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPendingUploadWork();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Form states for upload metadata
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Portrait");
  const [uploadLocation, setUploadLocation] = useState("");
  const [uploadPrice, setUploadPrice] = useState("1000");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [uploadCamera, setUploadCamera] = useState("");
  const [uploadLens, setUploadLens] = useState("");
  const [uploadIso, setUploadIso] = useState(0);
  const [exifFocalLength, setExifFocalLength] = useState("");
  const [exifAperture, setExifAperture] = useState("");
  const [exifShutterSpeed, setExifShutterSpeed] = useState("");
  const [uploadOrientation, setUploadOrientation] = useState<Orientation>("portrait");
  const [uploadRatio, setUploadRatio] = useState("aspect-[4/5]");
  const [uploadColor, setUploadColor] = useState("#9a6b3f");

  // Accept brief state
  const [acceptedBriefs, setAcceptedBriefs] = useState<Record<string, boolean>>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Photographer profile inputs
  const [specialty, setSpecialty] = useState("Editorial");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [profileSettingsLoaded, setProfileSettingsLoaded] = useState(false);
  const [profileSettings, setProfileSettings] = useState<{ bankName: string; bankAccountLast4: string }>({ bankName: "", bankAccountLast4: "" });

  useEffect(() => {
    if (user && !profileSettingsLoaded) {
      fetchPhotographerProfileSettings(user.id).then((settings) => {
        if (settings) {
          setLocation(settings.location);
          setSpecialty(settings.specialty);
          setBio(settings.bio);
          setProfileSettings({ bankName: settings.bankName, bankAccountLast4: settings.bankAccountLast4 });
        }
        setProfileSettingsLoaded(true);
      }).catch(() => setProfileSettingsLoaded(true));
    }
  }, [user, profileSettingsLoaded]);

  const handleDeletePhoto = (id: string) => {
    setPortfolioPhotos((prev) => prev.filter((p) => p.id !== id));
    toast.error("Photo removed", {
      description: "The asset was successfully deleted from your public archive.",
    });
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

  const analyzeImage = (file: File): Promise<{ ratio: string; orientation: Orientation; color: string }> => {
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

    // Analyze dimensions, aspect ratio, orientation and dominant color dynamically
    analyzeImage(file).then(({ ratio, orientation, color }) => {
      setUploadRatio(ratio);
      setUploadOrientation(orientation);
      setUploadColor(color);
    });

    // Extract EXIF data from the file
    let exifData = { camera: "", lens: "", iso: 0, focalLength: "", aperture: "", shutterSpeed: "", location: "" };
    try {
      const exif = await exifr.parse(file, true);
      if (exif) {
        exifData = {
          camera: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}` : (exif.Make || ""),
          lens: exif.LensModel || exif.LensMake || "",
          iso: exif.ISO || 0,
          focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : "",
          aperture: exif.FNumber ? `f/${exif.FNumber}` : "",
          shutterSpeed: exif.ExposureTime ? `1/${Math.round(1/exif.ExposureTime)}s` : "",
          location: exif.GPSLatitude ? `${exif.GPSLatitude.toFixed(4)}°, ${exif.GPSLongitude.toFixed(4)}°` : "",
        };
      }
    } catch (e) {
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
    const nameFromFilename = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
    if (nameFromFilename) setUploadTitle(nameFromFilename);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (cloudName && uploadPreset) {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      const fd = new FormData();
      
      xhr.open("POST", url, true);
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhrRef.current !== xhr) return;
          xhrRef.current = null;
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              setUploadedImageUrl(response.secure_url);
              setUploadProgress(100);
              uploadTimeoutRef.current = setTimeout(() => {
                uploadTimeoutRef.current = null;
                setUploadStep(2);
              }, 300);
            } catch {
              toast.error("Upload response was invalid. Falling back to local preview.");
              const objUrl = URL.createObjectURL(file);
              objectUrlRef.current = objUrl;
              setUploadedImageUrl(objUrl);
              setUploadProgress(100);
              uploadTimeoutRef.current = setTimeout(() => {
                uploadTimeoutRef.current = null;
                setUploadStep(2);
              }, 300);
            }
          } else {
            console.error("Cloudinary upload failed", xhr.responseText);
            toast.error("Cloudinary upload failed. Falling back to local preview.");
            const objUrl = URL.createObjectURL(file);
            objectUrlRef.current = objUrl;
            setUploadedImageUrl(objUrl);
            setUploadProgress(100);
            uploadTimeoutRef.current = setTimeout(() => {
              uploadTimeoutRef.current = null;
              setUploadStep(2);
            }, 300);
          }
        }
      };

      fd.append("upload_preset", uploadPreset);
      fd.append("file", file);
      xhr.send(fd);
    } else {
      const objUrl = URL.createObjectURL(file);
      objectUrlRef.current = objUrl;
      setUploadedImageUrl(objUrl);
      uploadIntervalRef.current = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 100) {
            if (uploadIntervalRef.current) {
              clearInterval(uploadIntervalRef.current);
              uploadIntervalRef.current = null;
            }
            uploadTimeoutRef.current = setTimeout(() => {
              uploadTimeoutRef.current = null;
              setUploadStep(2);
            }, 200);
            return 100;
          }
          return p + 20;
        });
      }, 150);
    }
  };

  const handlePublishPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadStep(3);

    const imageUrl = uploadedImageUrl;
    if (!imageUrl) {
      toast.error("Please upload an image first");
      return;
    }

    const newPhotoId = "upload-" + Date.now();
    const newPhotoItem: Photo = {
      id: newPhotoId,
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

    // Save to Supabase
    const saved = await createPhoto(newPhotoItem);
    if (saved) {
      setPortfolioPhotos((prev) => [saved, ...prev]);
    } else {
      // Fallback: add locally if Supabase fails
      setPortfolioPhotos((prev) => [newPhotoItem, ...prev]);
    }

    toast.success("Photo published!", {
      description: `"${uploadTitle || "Untitled Frame"}" is now visible under your portfolio.`,
    });
  };

  const handleAcceptBrief = (briefId: string) => {
    setAcceptingId(briefId);
    setTimeout(() => {
      setAcceptedBriefs((prev) => ({ ...prev, [briefId]: true }));
      setAcceptingId(null);
      toast.success("Brief Accepted!", {
        description: "You have been matched. Review the onboarding files sent to your email.",
      });
    }, 1200);
  };

  const resetUploadWizard = () => {
    clearPendingUploadWork();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setUploadTitle("");
    setUploadCategory("Portrait");
    setUploadLocation("");
    setUploadPrice("1000");
    setUploadFileName("");
    setUploadProgress(0);
    setUploadFile(null);
    setUploadedImageUrl("");
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

  const handlePriceUpdate = async (photoId: string) => {
    const newPrice = parseInt(editingPriceValue, 10);
    if (isNaN(newPrice) || newPrice < 1000) {
      toast.error("Minimum price is $1,000");
      return;
    }
    const ok = await updatePhotoPrice(photoId, newPrice);
    if (ok) {
      setPortfolioPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, price: newPrice } : p));
      toast.success(`Price updated to $${newPrice.toLocaleString()}`);
    } else {
      toast.error("Failed to update price");
    }
    setEditingPriceId(null);
  };

  const payoutsToRender = payouts.map((p) => ({
    id: p.id,
    date: p.date,
    method: p.method,
    amount: `$${p.amount.toLocaleString()}`,
    status: p.status,
  }));

  const stats = [
    { label: "REVENUE (LIFETIME)", value: `$${photographerStats.totalRevenue.toLocaleString()}` },
    { label: "DOWNLOADS", value: photographerStats.totalDownloads.toLocaleString() },
    { label: "FOLLOWERS", value: followerCount.toLocaleString() },
    { label: "PORTFOLIO", value: String(portfolioPhotos.length) },
  ];

  const pendingPayout = payouts.find((p) => p.status === "PENDING");
  const successfulPayouts = payouts.filter((p) => p.status === "SUCCESSFUL");
  const lastPayout = successfulPayouts[0];

  return (
    <div className="w-full bg-[#FAF9F5] py-8 sm:py-12 min-h-screen">
      <div className="mx-auto flex max-w-[1440px] gap-8 px-5 sm:px-8 lg:px-12">
        <SideNav
          items={nav}
          active={active}
          onSelect={setActive}
          header={() => (
            <div className="flex min-w-0 items-center gap-3">
              <img src={user?.avatar || photos[8]?.image || ""} alt="" loading="lazy" className="size-10 rounded-full object-cover ring-2 ring-[#1e4a3f]/10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name || "Photographer"}</p>
                <p className="text-xs text-[#6b716d]">Verified · {user?.company || "Contributor"}</p>
              </div>
            </div>
          )}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Eyebrow>PHOTOGRAPHER DASHBOARD</Eyebrow>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]">
                {active === "overview" && (() => {
                  const h = new Date().getHours();
                  return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${user?.name?.split(" ")[0] || "Photographer"}.`;
                })()}
                {active === "portfolio" && "My Portfolio"}
                {active === "analytics" && "Earnings & Metrics"}
                {active === "requests" && "Creative Briefs"}
                {active === "payouts" && "Payout Settings"}
                {active === "followers" && "Audience"}
                {active === "settings" && "Profile settings"}
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

          {/* Mobile nav */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 md:hidden">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  active === n.id
                    ? "border-[#1e4a3f] bg-[#1e4a3f] text-white"
                    : "border-[#ececec] bg-white text-[#6b716d]"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* 1. OVERVIEW VIEW */}
          {active === "overview" && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm ns-lift hover:border-[#1e4a3f]/20 hover:shadow-md transition-all duration-300"
                  >
                    <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">{s.label}</p>
                    <p className="mt-2 font-serif text-3xl text-[#18211f] font-medium">{s.value}</p>
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
                      <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip prefix="$" />} cursor={{ stroke: "#1e4a3f", strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="v" stroke="#1e4a3f" strokeWidth={2.5} fill="url(#rev)" />
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
                      <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f2eb", opacity: 0.5 }} />
                      <Bar dataKey="v" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
                      .sort((a, b) => b.downloads - a.downloads)
                      .slice(0, 4)
                      .map((p, i) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-4 hover:bg-[#FAF9F5] p-2.5 -mx-2.5 rounded-xl transition-all duration-200 group"
                      >
                        <span className="font-mono text-xs text-[#8a8f89]">0{i + 1}</span>
                        <img src={getOptimizedImageUrl(p.image, 100)} alt="" loading="lazy" className="size-12 object-cover rounded-lg group-hover:scale-[1.03] transition-all duration-200 shadow-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#18211f]">{p.title}</p>
                          <p className="text-xs text-[#6b716d]">{p.downloads.toLocaleString()} downloads</p>
                        </div>
                        <span className="font-serif text-base text-[#1e4a3f] font-semibold">${(p.downloads * p.price / 100).toFixed(0)}</span>
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
                          <p className="text-sm font-semibold text-[#18211f] truncate">{b.title}</p>
                          <Badge tone={b.status === "DELIVERED" ? "muted" : "green"}>{b.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-[#6b716d] font-mono">${b.budget} · {b.delivery}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PORTFOLIO VIEW */}
          {active === "portfolio" && (
            <div className="mt-8">
              {portfolioPhotos.length === 0 ? (
                <div className="border border-dashed border-[#ececec] rounded-2xl py-24 text-center bg-white">
                  <ImageIcon className="size-12 mx-auto text-[#758078] mb-4 opacity-55" />
                  <p className="font-serif text-2xl text-[#18211f]">No assets uploaded yet</p>
                  <p className="mt-2 text-sm text-[#6b716d] max-w-sm mx-auto">
                    Publish raw, premium editorial photographs to build your public licensing collection.
                  </p>
                  <button
                    onClick={() => {
                      setUploadStep(1);
                      setUploadOpen(true);
                    }}
                    className="mt-6 inline-flex items-center gap-2 bg-[#1e4a3f] px-5 py-2.5 text-xs font-semibold text-white rounded-full hover:bg-[#123b31] transition duration-200 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Upload First Image
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {portfolioPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="group relative flex flex-col bg-white border border-[#ececec]/80 rounded-2xl overflow-hidden shadow-sm hover:border-[#1e4a3f]/25 transition duration-300"
                    >
                      <div className="aspect-[4/5] relative overflow-hidden bg-[#d7d8d2] shrink-0">
                        <img src={getOptimizedImageUrl(p.image, 600)} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
                        
                        {/* Overlay tools */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition duration-200">
                          <button
                            onClick={() => handleDeletePhoto(p.id)}
                            className="p-2 bg-white/90 backdrop-blur-sm text-[#d4183d] rounded-full hover:bg-white transition shadow cursor-pointer"
                            aria-label="Remove work"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div className="absolute bottom-3 left-3">
                          <span className="bg-black/55 backdrop-blur-sm text-[8px] font-mono font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {p.category}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-serif text-base text-[#18211f] font-semibold truncate leading-snug">{p.title}</h3>
                          <p className="text-xs text-[#6b716d] flex items-center gap-1 mt-1">
                            <Camera className="size-3" /> {p.camera} · {p.lens}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[#ececec]/40 text-xs font-mono text-[#758078]">
                          {editingPriceId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <span>$</span>
                              <input
                                type="number"
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value)}
                                onBlur={() => handlePriceUpdate(p.id)}
                                onKeyDown={(e) => { if (e.key === "Enter") handlePriceUpdate(p.id); if (e.key === "Escape") setEditingPriceId(null); }}
                                className="w-20 border border-[#1e4a3f] rounded px-1.5 py-0.5 text-[#18211f] font-semibold outline-none"
                                autoFocus
                                min={1000}
                              />
                              <button onClick={() => setEditingPriceId(null)} className="text-[#d4183d] hover:text-[#b01530] cursor-pointer"><X className="size-3" /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingPriceId(p.id); setEditingPriceValue(String(p.price)); }}
                              className="hover:text-[#1e4a3f] hover:underline cursor-pointer transition"
                              title="Click to edit price"
                            >
                              ${p.price.toLocaleString()} License
                            </button>
                          )}
                          <span className="text-[#1e7a4f] bg-[#dce8df] px-2 py-0.5 rounded font-semibold uppercase text-[9px]">
                            Approved
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. ANALYTICS VIEW */}
          {active === "analytics" && (
            <div className="mt-8 space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Total Audience views</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-[#18211f]">{photographerStats.totalViews.toLocaleString()}</p>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Average License Fee</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-[#18211f]">${photographerStats.avgPrice.toLocaleString()}.00</p>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Total Likes</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-[#18211f]">{photographerStats.totalLikes.toLocaleString()}</p>
                </div>
              </div>

              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                <h3 className="mb-6 font-serif text-lg text-[#18211f]">Detailed Revenue History</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e4a3f" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#1e4a3f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ececec" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8a8f89" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip prefix="$" />} cursor={{ stroke: "#1e4a3f" }} />
                    <Area type="monotone" dataKey="v" stroke="#1e4a3f" strokeWidth={3} fill="url(#revFull)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <h3 className="font-serif text-base text-[#18211f] mb-4">Top Licensing Categories</h3>
                  <div className="space-y-3 font-mono text-xs">
                    {topCategories.length === 0 ? (
                      <p className="text-[#758078] text-xs">No data yet</p>
                    ) : topCategories.map((c) => (
                      <div key={c.name} className="flex items-center justify-between border-b border-[#ececec]/50 pb-2">
                        <span className="text-[#4a534e]">{c.name}</span>
                        <span className="font-semibold text-[#1e4a3f]">{c.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <h3 className="font-serif text-base text-[#18211f] mb-4">Key Client Accounts</h3>
                  <div className="space-y-3 font-mono text-xs">
                    <p className="text-[#758078] text-xs">No data yet</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. CREATIVE BRIEFS / REQUESTS VIEW */}
          {active === "requests" && (
            <div className="mt-8 space-y-4">
              {briefs.map((b) => (
                <div
                  key={b.id}
                  className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/25 transition duration-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-serif text-xl text-[#18211f] font-semibold">{b.title}</h2>
                        <Badge tone={b.status === "DELIVERED" ? "muted" : "green"}>{b.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[#6b716d]">{b.location} · {b.description}</p>
                    </div>
                    <div className="font-mono text-right text-sm">
                      <p className="text-xs text-[#758078]">BUDGET</p>
                      <p className="font-serif text-2xl font-bold text-[#1e4a3f]">${b.budget}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#ececec]/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                    <div className="flex gap-4 text-[#758078]">
                      <span>LICENSE: <strong className="text-[#18211f]">{b.license}</strong></span>
                      <span>DELIVERY: <strong className="text-[#18211f]">{b.delivery}</strong></span>
                    </div>

                    <div>
                      {acceptedBriefs[b.id] ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#1e7a4f] bg-[#dce8df] px-4 py-2 rounded-full font-semibold">
                          <Check className="size-4" /> Accepted & Active
                        </span>
                      ) : b.status === "DELIVERED" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#758078] bg-[#ece9df] px-4 py-2 rounded-full font-semibold">
                          Closed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcceptBrief(b.id)}
                          disabled={!!acceptingId}
                          className="flex items-center gap-1.5 bg-[#1e4a3f] hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 text-white font-semibold rounded-full transition-colors cursor-pointer"
                        >
                          {acceptingId === b.id ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Accepting...
                            </>
                          ) : (
                            <>
                              Accept Brief <ChevronRight className="size-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. PAYOUTS VIEW */}
          {active === "payouts" && (
            <div className="mt-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Pending Payout</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-[#18211f]">{pendingPayout ? `$${pendingPayout.amount.toLocaleString()}` : "$0.00"}</p>
                  <p className="text-xs text-[#6d746e] mt-1.5">{pendingPayout ? `Scheduled for Aug 1st` : "No pending payouts"}</p>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Gross Lifetime Sales</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-[#18211f]">${photographerStats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-[#1e7a4f] mt-1.5">70% average royalties</p>
                </div>
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm">
                  <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Last Payout Amount</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-[#18211f]">{lastPayout ? `$${lastPayout.amount.toLocaleString()}` : "$0.00"}</p>
                  <p className="text-xs text-[#1e7a4f] mt-1.5 font-mono">{lastPayout ? `Paid ${lastPayout.date}` : "No payouts yet"}</p>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-lg text-[#18211f] mb-4">Payout Ledger</h3>
                <div className="overflow-hidden border border-[#ececec]/80 bg-white rounded-2xl ns-shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f7f7f7] font-mono text-[10px] tracking-wider text-[#8a8f89] uppercase border-b border-[#ececec]">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Payment Date</th>
                        <th className="px-6 py-4">Routing / Method</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ececec]/60 font-mono text-xs">
                      {payoutsToRender.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF9F5] transition duration-150">
                          <td className="px-6 py-4 font-semibold text-[#18211f]">{p.id}</td>
                          <td className="px-6 py-4 text-[#6b716d]">{p.date}</td>
                          <td className="px-6 py-4 text-[#6b716d]">{p.method}</td>
                          <td className="px-6 py-4 text-[#18211f] font-semibold">{p.amount}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="bg-[#dce8df] text-[#1e7a4f] px-2 py-0.5 rounded-full font-bold text-[9px]">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm hover:border-[#1e4a3f]/10 transition-all duration-300">
                <h3 className="font-serif text-base text-[#18211f] mb-4">Bank & Routing Coordinates</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] text-[#758078] uppercase">Bank Account Name</p>
                    <p className="text-sm font-semibold text-[#18211f]">{user?.name || "Photographer"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-[9px] text-[#758078] uppercase">Bank Account</p>
                    <p className="text-sm font-semibold text-[#18211f]">
                      {profileSettings.bankAccountLast4 ? `**** ${profileSettings.bankAccountLast4}` : "Not configured — add in Settings"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. FOLLOWERS VIEW */}
          {active === "followers" && (
            <div className="mt-8">
              {followerCount === 0 ? (
                <div className="border border-dashed border-[#ececec] rounded-2xl py-24 text-center bg-white">
                  <Users className="size-12 mx-auto text-[#758078] mb-4 opacity-55" />
                  <p className="font-serif text-2xl text-[#18211f]">No followers yet</p>
                  <p className="mt-2 text-sm text-[#6b716d] max-w-sm mx-auto">
                    Share your work to attract creative directors, art buyers, and publishers.
                  </p>
                </div>
              ) : (
                <div className="border border-[#ececec]/80 bg-white rounded-2xl p-6 ns-shadow-sm text-center">
                  <Users className="size-10 mx-auto text-[#1e4a3f] mb-3" />
                  <p className="font-serif text-3xl text-[#18211f] font-medium">{followerCount.toLocaleString()}</p>
                  <p className="text-sm text-[#6b716d] mt-1">followers</p>
                </div>
              )}
            </div>
          )}

          {/* 7. SETTINGS VIEW */}
          {active === "settings" && (
            <div className="mt-8 border border-[#ececec]/80 bg-white rounded-2xl p-6 sm:p-8 ns-shadow-sm">
              <h3 className="font-serif text-xl text-[#18211f] mb-6">Profile Settings</h3>
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Location</span>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Primary specialty</span>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                    >
                      <option value="Editorial">Editorial</option>
                      <option value="Portrait">Portrait Study</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Fashion">Fashion & Street</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Culture">Culture & Heritage</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Biography</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm resize-none"
                  />
                </label>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={async () => {
                      if (user) {
                        const ok = await upsertPhotographerProfileSettings({
                          userId: user.id,
                          location,
                          specialty,
                          bio,
                          bankName: "",
                          bankAccountLast4: "",
                        });
                        if (ok) toast.success("Settings saved to database");
                        else toast.success("Settings saved");
                      } else {
                        toast.success("Settings saved");
                      }
                    }}
                    className="bg-[#1e4a3f] hover:bg-[#123b31] px-6 py-3 text-sm font-semibold text-white rounded-full transition-all duration-200 cursor-pointer shadow-md"
                  >
                    Save modifications
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
                  <h2 className="font-serif text-lg font-semibold text-[#18211f]">Upload new work</h2>
                </div>
                <button onClick={resetUploadWizard} className="p-1 hover:bg-[#FAF9F5] rounded-full transition-colors cursor-pointer">
                    <X className="size-5 text-[#6b716d]" />
                  </button>
              </div>

              {/* Steps indicators */}
              <div className="bg-[#FAF9F5] px-6 py-3 border-b border-[#ececec] flex items-center justify-between text-xs font-mono text-[#758078]">
                <div className="flex gap-4">
                  <span className={uploadStep === 1 ? "text-[#1e4a3f] font-bold" : "opacity-60"}>1. FILE</span>
                  <span>/</span>
                  <span className={uploadStep === 2 ? "text-[#1e4a3f] font-bold" : "opacity-60"}>2. METADATA</span>
                  <span>/</span>
                  <span className={uploadStep === 3 ? "text-[#1e4a3f] font-bold" : "opacity-60"}>3. COMPLETE</span>
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
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={handleFileDrop}
                      onClick={() => document.getElementById("file-upload-input")?.click()}
                      className="border-2 border-dashed border-[#ececec] hover:border-[#1e4a3f]/40 bg-[#FAF9F5]/50 hover:bg-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-[#1e4a3f] rounded-2xl py-12 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group"
                    >
                      {uploadProgress > 0 ? (
                        <div className="space-y-3 flex flex-col items-center">
                          <Loader2 className="size-10 text-[#1e4a3f] animate-spin" />
                          <p className="text-sm font-semibold text-[#18211f]">Uploading & parsing EXIF data...</p>
                          <div className="w-48 bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className="bg-[#1e4a3f] h-1.5 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid size-12 place-items-center rounded-full bg-[#dce8df]/60 text-[#1e4a3f] group-hover:scale-105 transition-transform duration-200 mb-3">
                            <Upload className="size-6" />
                          </div>
                          <p className="text-sm font-semibold text-[#18211f]">Drag & drop camera RAW or High-Res JPEG</p>
                          <p className="text-xs text-[#6b716d] mt-1">Accepts CR3, ARW, NEF, or TIFF up to 100MB</p>
                          <span className="mt-4 inline-flex text-xs font-semibold text-[#1e4a3f] bg-[#dce8df] px-3.5 py-1.5 rounded-full">
                            Select local file
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-start gap-3 bg-[#FAF9F5] p-4 rounded-xl border border-[#ececec]/60">
                      <AlertCircle className="size-5 text-[#1e4a3f] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#18211f]">Quality checklist for the Archive</p>
                        <p className="text-[11px] text-[#6d746e] mt-1 leading-normal">
                          Only license single exposures. No compositing, digital canvas manipulations, or synthetic AI generations (AI slop) allowed. Keep the photograph honest.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadStep === 2 && (
                  <form onSubmit={handlePublishPhoto} className="space-y-5">
                    <div className="flex items-center gap-4 bg-[#FAF9F5] p-3 rounded-xl border border-[#ececec]/60">
                      <img
                        src={uploadedImageUrl || ""}
                        alt="Preview"
                        loading="lazy"
                        className="size-16 object-cover rounded-lg shadow"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#18211f] truncate">{uploadFileName}</p>
                        <p className="text-[10px] text-[#758078] font-mono mt-0.5">
                          {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB · ${uploadFile.type.split("/")[1]?.toUpperCase() || "Image"}` : "Processing..."}
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
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Photograph Title</span>
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
                          <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Category</span>
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
                          <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Single License price ($)</span>
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
                        <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Shooting Location</span>
                        <input
                          value={uploadLocation}
                          onChange={(e) => setUploadLocation(e.target.value)}
                          placeholder="e.g. Arizona, USA"
                          className="mt-2 w-full border border-[#ececec] rounded-xl bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10 shadow-sm"
                        />
                      </label>

                      {/* EXIF Metadata Inputs */}
                      <div className="border border-[#ececec] bg-[#FAF9F5] rounded-xl p-4 space-y-4">
                        <p className="font-mono text-[9px] text-[#758078] uppercase tracking-wider">EXIF Metadata (Photographer can fill/edit manually)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Camera Body</span>
                            <input
                              value={uploadCamera}
                              onChange={(e) => setUploadCamera(e.target.value)}
                              placeholder="e.g. Sony A7 IV"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Optics/Lens</span>
                            <input
                              value={uploadLens}
                              onChange={(e) => setUploadLens(e.target.value)}
                              placeholder="e.g. 50mm f/1.2"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">ISO Sensitivity</span>
                            <input
                              type="number"
                              value={uploadIso || ""}
                              onChange={(e) => setUploadIso(Number(e.target.value))}
                              placeholder="e.g. 100"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Aperture</span>
                            <input
                              value={exifAperture}
                              onChange={(e) => setExifAperture(e.target.value)}
                              placeholder="e.g. f/2.8"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Shutter Speed</span>
                            <input
                              value={exifShutterSpeed}
                              onChange={(e) => setExifShutterSpeed(e.target.value)}
                              placeholder="e.g. 1/250s"
                              className="mt-1.5 w-full border border-[#ececec] rounded-lg bg-white px-3 py-2 text-xs outline-none transition focus:border-[#1e4a3f] focus:ring-1 focus:ring-[#1e4a3f]/10 shadow-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">Focal Length</span>
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

                    <div className="flex justify-end pt-4 border-t border-[#ececec]">
                      <button
                        type="submit"
                        className="bg-[#1e4a3f] hover:bg-[#123b31] px-6 py-2.5 text-sm font-semibold text-white rounded-full transition-all duration-200 cursor-pointer shadow-md"
                      >
                        Publish to Archive
                      </button>
                    </div>
                  </form>
                )}

                {uploadStep === 3 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <CheckCircle2 className="size-16 text-[#1e7a4f] animate-bounce" />
                    <div>
                      <p className="font-serif text-2xl text-[#18211f]">Photograph Published</p>
                      <p className="text-xs text-[#6d746e] mt-1.5 max-w-xs mx-auto">
                        Your image has been published successfully. Our editors will review it for quality standards shortly.
                      </p>
                    </div>
                    <div className="pt-6 flex gap-4 w-full justify-center">
                      <button
                        onClick={() => {
                          resetUploadWizard();
                          setActive("portfolio");
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
                          setUploadedImageUrl("");
                        }}
                        className="border border-[#ececec] hover:border-[#1e4a3f] text-[#4a534e] hover:text-[#1e4a3f] bg-white px-5 py-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Upload Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
