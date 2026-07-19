import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { isSupabaseReady, supabase } from "../../lib/supabase";
import { isStrongPassword, isValidEmail, normalizeEmail } from "../../lib/validation";

export type UserRole = "Buyer" | "Photographer" | "Enterprise" | "Admin" | "Guest";

export interface AuthUser {
  id: string;
  slug?: string;
  name: string;
  email: string;
  role: UserRole;
  plan?: string;
  company?: string;
  avatar?: string;
  memberSince?: string;
  downloadsLeft?: string;
  phone?: string;
  occupation?: string;
  dob?: string;
  socialLinks?: Record<string, string>;
  references?: { name: string; email: string; phone: string; relationship: string }[];
  verificationStatus?: string;
  status?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  signup: (data: { firstName: string; lastName: string; email: string; password: string; role?: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  upgradeToCreator: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_TIMEOUT = 15 * 60 * 1000;

function supabaseUserToAuthUser(supabaseUser: any, profile: any): AuthUser {
  return {
    id: supabaseUser.id,
    slug: profile?.slug || undefined,
    name: profile?.name || supabaseUser.email?.split("@")[0] || "User",
    email: supabaseUser.email || "",
    role: (profile?.role as UserRole) || "Buyer",
    plan: profile?.plan || "Starter",
    company: profile?.company || "",
    avatar: profile?.avatar || "",
    memberSince: profile?.member_since || "",
    downloadsLeft: profile?.downloads_left || "50",
    phone: profile?.phone || "",
    occupation: profile?.occupation || "",
    dob: profile?.dob || "",
    socialLinks: profile?.social_links || {},
    references: profile?.profile_references || [],
    verificationStatus: profile?.verification_status || "unverified",
    status: profile?.status || "Active",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (profile?.status === "Suspended" || profile?.status === "Blocked") {
            await supabase.auth.signOut();
            setUser(null);
            toast.error("Your account has been suspended or blocked. Contact support@nscaptures.com.");
          } else {
            setUser(supabaseUserToAuthUser(session.user, profile));
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Supabase unavailable:", err.message);
        setIsLoading(false);
      });

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const sub = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (profile?.status === "Suspended" || profile?.status === "Blocked") {
              await supabase.auth.signOut();
              setUser(null);
              toast.error("Your account has been suspended or blocked. Contact support@nscaptures.com.");
            } else {
              setUser(supabaseUserToAuthUser(session.user, profile));
            }
          } else if (event === "SIGNED_OUT") {
            setUser(null);
          }
        }
      );
      subscription = sub.data.subscription;
    } catch (err) {
      console.error("Supabase auth unavailable:", (err as Error).message);
    }

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.role !== "Admin") return;

    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        toast.error("Session expired due to inactivity. Please sign in again.");
        navigate("/admin/login", { replace: true });
      }
    }, 10000);

    let lastActivity = Date.now();
    const handleActivity = () => {
      lastActivity = Date.now();
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((event) => window.addEventListener(event, handleActivity));

    const activityCheck = setInterval(() => {
      if (Date.now() - lastActivity > ADMIN_SESSION_TIMEOUT) {
        supabase.auth.signOut();
        setUser(null);
        toast.error("Session expired due to inactivity. Please sign in again.");
        navigate("/admin/login", { replace: true });
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(activityCheck);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [user, navigate]);

  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) throw new Error("Enter a valid email address.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profile?.status === "Suspended" || profile?.status === "Blocked") {
      await supabase.auth.signOut();
      throw new Error("Your account has been suspended or blocked. Contact support@nscaptures.com.");
    }

    const authUser = supabaseUserToAuthUser(data.user, profile);
    setUser(authUser);
    toast.success("Welcome back, " + authUser.name.split(" ")[0]);

    const roleHome: Record<string, string> = {
      Admin: "/admin",
      Photographer: "/dashboard",
      Enterprise: "/enterprise",
      Buyer: "/account",
    };
    const from = (location.state as { from?: string })?.from || roleHome[authUser.role] || "/account";
    navigate(from, { replace: true });
  }, [location.state, navigate]);

  const signup = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string; role?: string }) => {
    if (!isSupabaseReady()) {
      toast.error("Database connection unavailable", { description: "Please check your environment variables." });
      return { needsEmailConfirmation: false };
    }

    const normalized = normalizeEmail(data.email);
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();

    if (!isValidEmail(normalized)) throw new Error("Enter a valid email address.");
    if (!firstName || !lastName) throw new Error("First name and last name are required.");
    if (!isStrongPassword(data.password)) throw new Error("Use at least 10 characters with letters and numbers.");

    const { data: siteConfig } = await supabase
      .from("site_settings")
      .select("signup_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (siteConfig?.signup_enabled === false) {
      throw new Error("New account registration is temporarily disabled. Please try again later.");
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: normalized,
      password: data.password,
      options: {
        data: {
          name: `${firstName} ${lastName}`,
          role: data.role || "Buyer",
          plan: "Starter",
        },
      },
    });
    if (error) throw new Error(error.message);

    if (authData.user) {
      if (authData.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        const authUser = supabaseUserToAuthUser(authData.user, profile);
        setUser(authUser);
        navigate("/account", { replace: true });
        return { needsEmailConfirmation: false };
      }
      return { needsEmailConfirmation: true };
    }
    return { needsEmailConfirmation: false };
  }, [navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast("Signed out");
    navigate("/signin", { replace: true });
  }, [navigate]);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;
    const { id: _id, role: _role, slug: _slug, verificationStatus: _vs, ...editableData } = data;

    if (editableData.email && editableData.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: editableData.email });
      if (emailError) throw new Error(emailError.message);
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        name: editableData.name,
        company: editableData.company,
        avatar: editableData.avatar,
        phone: editableData.phone,
        occupation: editableData.occupation,
        dob: editableData.dob,
        social_links: editableData.socialLinks,
        profile_references: editableData.references,
      })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    if (user.role === "Photographer" && user.slug && editableData.name) {
      await supabase
        .from("photographers")
        .update({ name: editableData.name })
        .eq("id", user.slug);
    }

    const updated = { ...user, ...editableData, verificationStatus: user.verificationStatus, slug: user.slug };
    setUser(updated);
    toast.success("Profile saved");
  }, [user]);

  const upgradeToCreator = useCallback(async () => {
    if (!user) return;
    if (user.role === "Photographer") return;

    try {
      const slug = user.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-£/g, "")
        + "-" + user.id.slice(0, 8);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "Photographer", slug })
        .eq("id", user.id);

      if (profileError) throw new Error(profileError.message);

      const { error: photoError } = await supabase
        .from("photographers")
        .insert({
          id: slug,
          name: user.name,
          image: user.avatar || "https://images.unsplash.com/photo-1593351799227-75df2026356b"
        });

      if (photoError) throw new Error(photoError.message);

      setUser({ ...user, role: "Photographer", slug });
      toast.success("Welcome to the Creator Dashboard!");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Could not upgrade account");
    }
  }, [user, navigate]);

  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user) throw new Error("Not authenticated");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) throw new Error("Current password is incorrect");

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw new Error(error.message);
    toast.success("Password updated");
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, signup, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
