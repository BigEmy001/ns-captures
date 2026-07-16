import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router";
import {
  Menu, Search, X, Compass, Trophy, Flame, Award, Sparkles, Video, BookOpen,
  LogIn, Code2, Puzzle, LifeBuoy, Flag, Handshake, FileText, Globe, MoreHorizontal,
  ShoppingBag, Trash2, ShieldCheck, ArrowRight, CheckCircle, Loader2, User, LogOut, Settings,
  Building2, Briefcase, Camera,
} from "lucide-react";
import { Monogram } from "./ui";
import { Dropdown, DropdownItem } from "./Dropdown";
import { useRequest } from "./RequestModal";
import { getCart, removeFromCart, clearCart, CartItem } from "../data/cart";
import { createPurchase, createLicense, logActivity, incrementPhotoDownloads, fetchPhoto } from "../data/db";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserRole } from "../context/AuthContext";

const publicLinks = [
  { to: "/search", label: "Discover" },
  { to: "/collections", label: "Collections" },
  { to: "/requests", label: "Requests" },
  { to: "/pricing", label: "Pricing" },
];

const photographerLinks = [
  { to: "/search", label: "Discover" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/collections", label: "Collections" },
  { to: "/requests", label: "Requests" },
];

const buyerLinks = [
  { to: "/search", label: "Discover" },
  { to: "/account", label: "My Account" },
  { to: "/collections", label: "Collections" },
  { to: "/requests", label: "Requests" },
  { to: "/pricing", label: "Pricing" },
];

const enterpriseLinks = [
  { to: "/search", label: "Discover" },
  { to: "/enterprise", label: "Enterprise" },
  { to: "/account", label: "Account" },
  { to: "/collections", label: "Collections" },
  { to: "/requests", label: "Requests" },
];

const adminLinks = [
  { to: "/admin", label: "Admin Console" },
  { to: "/search", label: "Discover" },
];

const getLinksForRole = (role: UserRole) => {
  switch (role) {
    case "Photographer":
      return photographerLinks;
    case "Buyer":
      return buyerLinks;
    case "Enterprise":
      return enterpriseLinks;
    case "Admin":
      return adminLinks;
    default:
      return publicLinks;
  }
};

const getExploreItems = (role: UserRole): DropdownItem[] => {
  const base: DropdownItem[] = [
    { label: "Become a Contributor", icon: Award, to: "/contribute" },
  ];
  if (role === "Buyer" || role === "Enterprise") {
    base.push({ label: "Enterprise Portal", icon: Sparkles, to: "/enterprise" });
  }
  if (role === "Photographer") {
    base.push({ label: "Photographer Dashboard", icon: Camera, to: "/dashboard" });
  }
  if (role === "Admin") {
    base.push({ divider: true, label: "d-admin" }, { label: "Admin Console", icon: Code2, to: "/admin" });
  }
  return base;
};

const getMoreItems = (role: UserRole, user: { id: string; name: string; email: string; avatar?: string } | null): DropdownItem[] => {
  if (!user) {
    return [
      { label: "Sign in / Join", icon: LogIn, to: "/signin" },
      { label: "Licensing Terms", icon: FileText, to: "/pricing" },
      { label: "Help & FAQ", icon: LifeBuoy, to: "/contribute" },
      { divider: true, label: "d2" },
      { label: "Language: English", icon: Globe, flag: "🇺🇸", to: "/" },
    ];
  }
  const items: DropdownItem[] = [
    { label: "My Account", icon: User, to: "/account" },
    { label: "Settings", icon: Settings, to: "/account" },
  ];
  if (role === "Photographer") {
    items.push({ label: "Dashboard", icon: Camera, to: "/dashboard" });
  }
  if (role === "Enterprise") {
    items.push({ label: "Enterprise Portal", icon: Building2, to: "/enterprise" });
  }
  if (role === "Admin") {
    items.push({ divider: true, label: "d-admin" }, { label: "Admin Console", icon: Code2, to: "/admin" });
  }
  items.push(
    { divider: true, label: "d3" },
    { label: "Licensing Terms", icon: FileText, to: "/pricing" },
    { label: "Help & FAQ", icon: LifeBuoy, to: "/contribute" },
    { divider: true, label: "d4" },
    { label: "Sign out", icon: LogOut, action: "logout" },
  );
  return items;
};

export function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const openRequest = useRequest();

  // Cart States
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "success">("idle");

  // Search Visibility State
  const { pathname } = useLocation();
  const [showSearch, setShowSearch] = useState(false);

  const links = getLinksForRole(user?.role || "Guest");
  const exploreItems = getExploreItems(user?.role || "Guest");
  const moreItems = getMoreItems(user?.role || "Guest", user);

  useEffect(() => {
    if (pathname !== "/") {
      setShowSearch(true);
      return;
    }
    setShowSearch(false);
    const handleScroll = () => {
      const heroSearchEl = document.querySelector(".hero-search-wrapper");
      if (heroSearchEl) {
        const rect = heroSearchEl.getBoundingClientRect();
        setShowSearch(rect.bottom < 60);
      } else {
        setShowSearch(window.scrollY > 450);
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
    if (menu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  const handleMoreClick = (item: DropdownItem) => {
    if (item.action === "logout") {
      logout();
      setMenu(false);
    }
  };

  useEffect(() => {
    setCartItems(getCart());
    const handleUpdate = () => setCartItems(getCart());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ns-cart") {
        setCartItems(getCart());
      }
    };
    const handleOpen = () => setCartOpen(true);
    
    window.addEventListener("cart-updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("cart-open", handleOpen);
    return () => {
      window.removeEventListener("cart-updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cart-open", handleOpen);
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setMenu(false);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      toast.error("Sign in to complete checkout");
      setCartOpen(false);
      navigate("/signin", { state: { from: "/account" } });
      return;
    }
    setCheckoutStatus("loading");

    const now = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

    for (const item of cartItems) {
      // Create purchase record
      await createPurchase({
        userId: user!.id,
        photoId: item.photoId,
        license: item.license,
        price: item.price,
        date: dateStr,
      });

      // Create license record
      const photo = await fetchPhoto(item.photoId);
      await createLicense({
        userId: user!.id,
        photoId: item.photoId,
        title: photo?.title || item.title,
        licenseType: item.license,
        price: item.price,
        purchasedAt: now,
        expiresAt: "Perpetual",
        downloads: 0,
      });

      // Increment download count
      await incrementPhotoDownloads(item.photoId);

      // Log activity
      await logActivity({
        userId: user!.id,
        type: "purchase",
        title: `License purchased: ${photo?.title || item.title}`,
        desc: `${item.license} license for $${item.price}`,
      });
    }

    setCheckoutStatus("success");
    setTimeout(() => {
      toast.success("License acquired successfully!", {
        description: `Acquired licenses for ${cartItems.length} photos.`,
      });
      clearCart();
      setCheckoutStatus("idle");
      setCartOpen(false);
      navigate("/account");
    }, 1500);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#ededed] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-5 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link to="/">
            <Monogram />
          </Link>

          <form
            onSubmit={submit}
            className={`hidden md:flex flex-1 items-center gap-2 rounded-full border bg-[#f5f5f5] transition-all duration-300 ease-in-out origin-center overflow-hidden ${
              showSearch
                ? "max-w-md opacity-100 translate-y-0 scale-100 px-4 py-2.5 border-[#e6e6e6] pointer-events-auto"
                : "max-w-0 opacity-0 -translate-y-1 scale-95 px-0 py-0 border-transparent pointer-events-none"
            }`}
          >
            <Search className="size-4 shrink-0 text-[#6b716d]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search photographs, people, places..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa09b]"
            />
          </form>

          <nav className="ml-auto hidden items-center gap-7 text-sm lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `relative pb-1.5 transition-colors duration-200 hover:text-[#18211f] ${
                    isActive ? "text-[#18211f] font-semibold" : "text-[#4a534e]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <motion.span
                        layoutId="active-nav-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e4a3f] rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {user?.role !== "Admin" && (
              <Dropdown label="Explore" items={exploreItems} align="right" />
            )}
            <Dropdown
              align="right"
              items={moreItems}
              trigger={
                isAuthenticated ? (
                  user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile"
                      className="size-8 rounded-full object-cover border border-[#ececec] hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="grid size-8 place-items-center rounded-full bg-[#1e4a3f] text-white font-serif text-sm font-semibold hover:opacity-90 transition-opacity">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                  )
                ) : (
                  <MoreHorizontal className="size-5 text-[#4a534e]" />
                )
              }
              onItemClick={handleMoreClick}
            />

            {/* Shopping Cart Icon */}
            {user?.role !== "Admin" && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-1.5 text-[#4a534e] hover:text-[#18211f] transition-colors duration-200 cursor-pointer"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="size-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center bg-[#1e4a3f] text-[8px] font-mono font-bold text-white rounded-full">
                    {cartItems.length}
                  </span>
                )}
              </button>
            )}

            {user?.role !== "Admin" && (
              <button
                onClick={openRequest}
                className="rounded-full bg-[#1e4a3f] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#123b31]"
              >
                Start a project
              </button>
            )}
            {!isAuthenticated && !isLoading && (
              <Link
                to="/signin"
                className="rounded-full border border-[#111] px-5 py-2 text-sm font-semibold text-[#111] transition hover:bg-[#111] hover:text-white"
              >
                Join
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-4 lg:hidden">
            {/* Mobile Cart Button */}
            {user?.role !== "Admin" && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-1.5 text-[#4a534e] hover:text-[#18211f]"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="size-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid size-3.5 place-items-center bg-[#1e4a3f] text-[7px] font-mono font-bold text-white rounded-full">
                    {cartItems.length}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setMenu((v) => !v)}>
              {menu ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
          {menu && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 z-50 flex flex-col bg-[#12231f] text-white p-6 overflow-y-auto lg:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link to="/" onClick={() => setMenu(false)}>
                  <Monogram light />
                </Link>
                <div className="flex items-center gap-4">
                  {/* Cart icon */}
                  {user?.role !== "Admin" && (
                    <button
                      onClick={() => {
                        setMenu(false);
                        setCartOpen(true);
                      }}
                      className="relative p-1.5 text-white/80 hover:text-white"
                    >
                      <ShoppingBag className="size-5" />
                      {cartItems.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center bg-white text-[8px] font-mono font-bold text-[#12231f] rounded-full">
                          {cartItems.length}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setMenu(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
                  >
                    <X className="size-6" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <form
                onSubmit={submit}
                className="mt-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3"
              >
                <Search className="size-4 text-white/50" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search photographs, collections..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </form>

              {/* Navigation Links */}
              <div className="flex-1 flex flex-col justify-center py-8 space-y-10">
                <nav className="flex flex-col space-y-5">
                  {links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMenu(false)}
                      className="font-serif text-3xl font-light tracking-tight hover:text-white/70 transition-colors duration-200"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>

                <div className="border-t border-white/10 pt-8 grid grid-cols-2 gap-4 text-xs text-white/70">
                  <div className="space-y-3 flex flex-col">
                    {isAuthenticated ? (
                      <>
                        <Link to="/account" onClick={() => setMenu(false)} className="hover:text-white">
                          My Account
                        </Link>
                        {user?.role === "Photographer" && (
                          <Link to="/dashboard" onClick={() => setMenu(false)} className="hover:text-white">
                            Photographer Dashboard
                          </Link>
                        )}
                        {user?.role === "Enterprise" && (
                          <Link to="/enterprise" onClick={() => setMenu(false)} className="hover:text-white">
                            Enterprise Portal
                          </Link>
                        )}
                        {user?.role === "Admin" && (
                          <Link to="/admin" onClick={() => setMenu(false)} className="hover:text-white">
                            Admin Console
                          </Link>
                        )}
                      </>
                    ) : (
                      <Link to="/signin" onClick={() => setMenu(false)} className="hover:text-white">
                        Sign In / Join
                      </Link>
                    )}
                  </div>
                  <div className="space-y-3 flex flex-col">
                    {isAuthenticated ? (
                      <button
                        onClick={() => { setMenu(false); logout(); }}
                        className="hover:text-white text-left"
                      >
                        Sign out
                      </button>
                    ) : (
                      <Link to="/signin" onClick={() => setMenu(false)} className="hover:text-white">
                        Sign In / Join
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer / CTA section */}
              <div className="border-t border-white/10 pt-6 mt-auto space-y-4">
                {user?.role !== "Admin" && (
                  <button
                    onClick={() => {
                      setMenu(false);
                      openRequest();
                    }}
                    className="w-full rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#12231f] hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    Start a project
                  </button>
                )}
                <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-white/40">
                  <span>NS CAPTURES © 2026</span>
                  <span>LAGOS, NIGERIA</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Cart Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => checkoutStatus === "idle" && setCartOpen(false)}
      />

      {/* Cart Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FAF9F5] shadow-2xl transition-transform duration-300 transform flex flex-col ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ececec] bg-white px-6 py-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-[#1e4a3f]" />
            <h2 className="font-serif text-lg font-semibold text-[#18211f]">Shopping Cart</h2>
            <span className="font-mono text-xs text-[#758078]">({cartItems.length})</span>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            disabled={checkoutStatus !== "idle"}
            className="p-1 hover:bg-[#FAF9F5] rounded-full transition-colors cursor-pointer"
          >
            <X className="size-5 text-[#6b716d]" />
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {checkoutStatus === "idle" && cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
              <div className="grid size-16 place-items-center rounded-full bg-[#dce8df]/60 text-[#1e4a3f]">
                <ShoppingBag className="size-8" />
              </div>
              <div>
                <p className="font-serif text-lg text-[#18211f]">Your cart is empty</p>
                <p className="text-xs text-[#6d746e] mt-1">License high-quality photography from the archive.</p>
              </div>
              <button
                onClick={() => {
                  setCartOpen(false);
                  navigate("/search");
                }}
                className="mt-2 text-xs font-semibold text-[#1e4a3f] bg-[#dce8df] px-4 py-2 rounded-full hover:bg-[#dce8df]/80 transition duration-200 cursor-pointer"
              >
                Browse Library
              </button>
            </div>
          ) : checkoutStatus !== "idle" ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-5">
              {checkoutStatus === "loading" ? (
                <>
                  <Loader2 className="size-10 text-[#1e4a3f] animate-spin" />
                  <div>
                    <p className="font-serif text-lg text-[#18211f]">Securing Licenses...</p>
                    <p className="text-xs text-[#6d746e] mt-1">Verifying rights with the creator and network.</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="size-12 text-[#1e7a4f] animate-bounce" />
                  <div>
                    <p className="font-serif text-lg text-[#18211f]">Transaction Approved!</p>
                    <p className="text-xs text-[#6d746e] mt-1">Preparing your high-resolution downloads.</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white border border-[#ececec]/80 rounded-xl p-4 shadow-sm"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="size-16 object-cover rounded-lg shadow-inner"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#18211f]">{item.title}</p>
                    <span className="font-mono text-[8px] font-semibold text-[#1e4a3f] bg-[#dce8df] px-1.5 py-0.5 rounded uppercase">
                      {item.license}
                    </span>
                  </div>
                  <p className="text-xs text-[#6d746e]">by {item.photographer}</p>
                  <p className="font-serif text-sm text-[#18211f] font-medium">${item.price}</p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-[#6b716d] hover:text-[#d4183d] hover:bg-[#fcf1f3] rounded-full transition-colors cursor-pointer"
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info & checkout */}
        {cartItems.length > 0 && checkoutStatus === "idle" && (
          <div className="border-t border-[#ececec] bg-white px-6 py-6 space-y-4">
            <div className="space-y-2 text-sm text-[#6b716d]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#18211f] font-semibold">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Licensing fees</span>
                <span className="text-[#1e7a4f]">Tax included</span>
              </div>
              <div className="flex justify-between border-t border-[#ececec]/60 pt-3 text-base text-[#18211f]">
                <span className="font-serif">Total Due</span>
                <span className="font-serif font-bold text-lg">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 bg-[#1e4a3f] hover:bg-[#123b31] text-white py-3 rounded-full text-sm font-semibold shadow-md transition duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <ShieldCheck className="size-4" /> Secure Checkout
            </button>
            <p className="text-[10px] text-center text-[#8a8f89] flex items-center justify-center gap-1">
              <Lock className="size-3 text-[#1e4a3f]" /> Encrypted 256-bit SSL transaction
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Small Lock helper since it's used in footer
function Lock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}
