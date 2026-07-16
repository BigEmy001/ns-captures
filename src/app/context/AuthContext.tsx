import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export type UserRole = "Buyer" | "Photographer" | "Enterprise" | "Admin" | "Guest";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan?: string;
  company?: string;
  avatar?: string;
  memberSince?: string;
  downloadsLeft?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  signup: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_TIMEOUT = 15 * 60 * 1000;

// ============================================================
// MOCK USERS (fallback when Supabase is not configured)
// ============================================================
const MOCK_USERS: Record<string, { password: string; user: AuthUser }> = {
  "amara@mainlandstudio.co": {
    password: "password123",
    user: {
      id: "U-1042",
      name: "Amara Okafor",
      email: "amara@mainlandstudio.co",
      role: "Enterprise",
      plan: "Studio",
      company: "Mainland Studio",
      avatar: "https://images.unsplash.com/photo-1593351799227-75df2026356b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
      memberSince: "Mar 2025",
      downloadsLeft: "Unlimited",
    },
  },
  "namnso@ns.co": {
    password: "password123",
    user: {
      id: "U-1044",
      name: "Namnso Ukpanah",
      email: "namnso@ns.co",
      role: "Photographer",
      plan: "Contributor",
      company: "Namnso Ukpanah Studios",
      avatar: "https://images.unsplash.com/photo-1749058387715-1efad0eadc8c?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
      memberSince: "Jan 2024",
      downloadsLeft: "N/A",
    },
  },
  "divine@studio.ng": {
    password: "password123",
    user: {
      id: "U-1051",
      name: "Divine Effiong",
      email: "divine@studio.ng",
      role: "Photographer",
      plan: "Contributor",
      company: "Divine Studio",
      avatar: "https://images.unsplash.com/photo-1593351799227-75df2026356b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
      memberSince: "Jul 2026",
      downloadsLeft: "N/A",
    },
  },
  "daniel@paystack.co": {
    password: "password123",
    user: {
      id: "U-1067",
      name: "Daniel Okoro",
      email: "daniel@paystack.co",
      role: "Buyer",
      plan: "Pro",
      company: "Paystack",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
      memberSince: "Feb 2026",
      downloadsLeft: "247",
    },
  },
  "admin@ns.co": {
    password: "admin123",
    user: {
      id: "U-0001",
      name: "NS Admin",
      email: "admin@ns.co",
      role: "Admin",
      plan: "Platform",
      company: "NS CAPTURES",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
      memberSince: "Jan 2024",
      downloadsLeft: "Unlimited",
    },
  },
  "patrick@ns.co": {
    password: "password123",
    user: {
      id: "U-1090",
      name: "Patrick Watson Quine",
      email: "patrick@ns.co",
      role: "Photographer",
      plan: "Contributor",
      company: "Patrick Watson Quine Photography",
      avatar: "https://res.cloudinary.com/odu5iecy/image/upload/v1784203446/ns-captures/AM%20Downtown%20Closeup%20C-1.jpg",
      memberSince: "Jul 2026",
      downloadsLeft: "N/A",
    },
  },
  "lexmond@ns.co": {
    password: "password123",
    user: {
      id: "U-1092",
      name: "Lexmond Dennis",
      email: "lexmond@ns.co",
      role: "Photographer",
      plan: "Contributor",
      company: "Lexmond Dennis Photography",
      avatar: "https://res.cloudinary.com/odu5iecy/image/upload/v1784205071/ns-captures-lexmond/lexmond_photo_2.jpg",
      memberSince: "Jul 2026",
      downloadsLeft: "N/A",
    },
  },
  "haru@ns.co": {
    password: "haru2026",
    user: {
      id: "haru-tanaka",
      email: "haru@ns.co",
      name: "Haru Tanaka",
      slug: "haru-tanaka",
      role: "Photographer",
      plan: "Contributor",
      company: "Haru Tanaka Photography",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
      memberSince: "Jul 2026",
      downloadsLeft: "N/A",
    },
  },
};

// ============================================================
// Helper: map Supabase user + profile to AuthUser
// ============================================================
function supabaseUserToAuthUser(supabaseUser: any, profile: any): AuthUser {
  return {
    id: supabaseUser.id,
    name: profile?.name || supabaseUser.email?.split("@")[0] || "User",
    email: supabaseUser.email || "",
    role: (profile?.role as UserRole) || "Buyer",
    plan: profile?.plan || "Starter",
    company: profile?.company || "",
    avatar: profile?.avatar || "",
    memberSince: profile?.member_since || "",
    downloadsLeft: profile?.downloads_left || "50",
  };
}

// ============================================================
// Provider
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // ----------------------------------------------------------
  // Restore session on mount
  // ----------------------------------------------------------
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Supabase: get existing session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setUser(supabaseUserToAuthUser(session.user, profile));
        }
        setIsLoading(false);
      });

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            setUser(supabaseUserToAuthUser(session.user, profile));
          } else if (event === "SIGNED_OUT") {
            setUser(null);
          }
        }
      );

      return () => subscription.unsubscribe();
    } else {
      // Mock: restore from localStorage/sessionStorage
      const storedEntries = [
        [localStorage, localStorage.getItem("ns-auth")],
        [sessionStorage, sessionStorage.getItem("ns-auth")],
      ] as const;

      for (const [storage, stored] of storedEntries) {
        if (!stored) continue;
        try {
          const parsed = JSON.parse(stored);
          if (parsed.expires && Date.now() > parsed.expires) {
            storage.removeItem("ns-auth");
            continue;
          }
          if (parsed.user && typeof parsed.user.id === "string") {
            setUser(parsed.user);
            break;
          }
        } catch {
          storage.removeItem("ns-auth");
        }
      }
      setIsLoading(false);
    }
  }, []);

  // ----------------------------------------------------------
  // Admin session idle timeout
  // ----------------------------------------------------------
  useEffect(() => {
    if (!user || user.role !== "Admin") return;
    if (!isSupabaseConfigured) {
      // Mock admin timeout
      const interval = setInterval(() => {
        const storedEntries = [
          [localStorage, localStorage.getItem("ns-auth")],
          [sessionStorage, sessionStorage.getItem("ns-auth")],
        ] as const;
        let expired = false;
        for (const [storage, stored] of storedEntries) {
          if (!stored) continue;
          try {
            const parsed = JSON.parse(stored);
            if (parsed.expires && Date.now() > parsed.expires) {
              storage.removeItem("ns-auth");
              expired = true;
            }
          } catch {
            storage.removeItem("ns-auth");
            expired = true;
          }
        }
        if (expired) {
          setUser(null);
          toast.error("Session expired due to inactivity. Please sign in again.");
          navigate("/admin/login", { replace: true });
        }
      }, 10000);

      let lastUpdate = Date.now();
      const handleActivity = () => {
        const now = Date.now();
        if (now - lastUpdate < 5000) return;
        lastUpdate = now;
        const storedEntries = [
          [localStorage, localStorage.getItem("ns-auth")],
          [sessionStorage, sessionStorage.getItem("ns-auth")],
        ] as const;
        for (const [storage, stored] of storedEntries) {
          if (!stored) continue;
          try {
            const parsed = JSON.parse(stored);
            if (parsed.user && parsed.user.role === "Admin") {
              parsed.expires = now + ADMIN_SESSION_TIMEOUT;
              storage.setItem("ns-auth", JSON.stringify(parsed));
            }
          } catch { /* ignore */ }
        }
      };
      const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
      events.forEach((event) => window.addEventListener(event, handleActivity));
      return () => {
        clearInterval(interval);
        events.forEach((event) => window.removeEventListener(event, handleActivity));
      };
    }
  }, [user, navigate]);

  // ----------------------------------------------------------
  // Mock persist helper
  // ----------------------------------------------------------
  const mockPersist = useCallback((u: AuthUser, remember: boolean) => {
    const payload = {
      user: u,
      expires: u.role === "Admin" ? Date.now() + ADMIN_SESSION_TIMEOUT : (remember ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null),
    };
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    storage.setItem("ns-auth", JSON.stringify(payload));
    otherStorage.removeItem("ns-auth");
    setUser(u);
  }, []);

  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------
  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    const normalized = email.toLowerCase().trim();

    if (isSupabaseConfigured && supabase) {
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
    } else {
      // Mock fallback
      const record = MOCK_USERS[normalized];
      if (!record || record.password !== password) {
        throw new Error("Invalid email or password");
      }
      mockPersist(record.user, !!remember);
      toast.success("Welcome back, " + record.user.name.split(" ")[0]);
      const roleHome: Record<string, string> = {
        Admin: "/admin",
        Photographer: "/dashboard",
        Enterprise: "/enterprise",
        Buyer: "/account",
      };
      const from = (location.state as { from?: string })?.from || roleHome[record.user.role] || "/account";
      navigate(from, { replace: true });
    }
  }, [location.state, navigate, mockPersist]);

  // ----------------------------------------------------------
  // SIGNUP
  // ----------------------------------------------------------
  const signup = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const normalized = data.email.toLowerCase().trim();

    if (isSupabaseConfigured && supabase) {
      const { data: authData, error } = await supabase.auth.signUp({
        email: normalized,
        password: data.password,
        options: {
          data: {
            name: `${data.firstName} ${data.lastName}`,
            role: "Buyer",
            plan: "Starter",
          },
        },
      });
      if (error) throw new Error(error.message);

      if (authData.user) {
        // Profile is auto-created by the trigger
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        const authUser = supabaseUserToAuthUser(authData.user, profile);
        setUser(authUser);
        toast.success("Account created", { description: "Welcome to NS CAPTURES!" });
        navigate("/account", { replace: true });
      }
    } else {
      // Mock fallback
      if (MOCK_USERS[normalized]) {
        throw new Error("An account with this email already exists");
      }
      const newUser: AuthUser = {
        id: "U-" + Date.now().toString().slice(-4),
        name: `${data.firstName} ${data.lastName}`,
        email: normalized,
        role: "Buyer",
        plan: "Starter",
        company: "",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=150",
        memberSince: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        downloadsLeft: "50",
      };
      MOCK_USERS[normalized] = { password: data.password, user: newUser };
      mockPersist(newUser, false);
      toast.success("Account created", { description: "Welcome to NS CAPTURES!" });
      navigate("/account", { replace: true });
    }
  }, [navigate, mockPersist]);

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------
  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("ns-auth");
    sessionStorage.removeItem("ns-auth");
    setUser(null);
    toast("Signed out");
    navigate("/signin", { replace: true });
  }, [navigate]);

  // ----------------------------------------------------------
  // UPDATE PROFILE
  // ----------------------------------------------------------
  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;
    const { id: _id, role: _role, ...editableData } = data;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editableData.name,
          email: editableData.email,
          company: editableData.company,
          avatar: editableData.avatar,
        })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      const updated = { ...user, ...editableData };
      setUser(updated);
      toast.success("Profile saved");
    } else {
      // Mock fallback
      const normalizedEmail = editableData.email?.toLowerCase().trim() || user.email;
      if (normalizedEmail !== user.email && MOCK_USERS[normalizedEmail]) {
        throw new Error("An account with this email already exists");
      }
      const updated: AuthUser = { ...user, ...editableData, email: normalizedEmail, id: user.id, role: user.role };
      const record = MOCK_USERS[user.email];
      if (record) {
        if (normalizedEmail !== user.email) delete MOCK_USERS[user.email];
        MOCK_USERS[normalizedEmail] = { ...record, user: updated };
      }
      const remember = localStorage.getItem("ns-auth") !== null;
      mockPersist(updated, remember);
      toast.success("Profile saved");
    }
  }, [user, mockPersist]);

  // ----------------------------------------------------------
  // CHANGE PASSWORD
  // ----------------------------------------------------------
  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user) throw new Error("Not authenticated");

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(error.message);
      toast.success("Password updated");
    } else {
      // Mock fallback
      const record = MOCK_USERS[user.email];
      if (!record || record.password !== current) {
        throw new Error("Current password is incorrect");
      }
      record.password = next;
      toast.success("Password updated");
    }
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
