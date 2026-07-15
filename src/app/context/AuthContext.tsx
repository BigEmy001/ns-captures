import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

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
};

const userRoles: UserRole[] = ["Buyer", "Photographer", "Enterprise", "Admin", "Guest"];

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthUser>;
  return typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    userRoles.includes(candidate.role as UserRole);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
        if (isAuthUser(parsed.user)) {
          setUser(parsed.user);
          break;
        }
      } catch {
        storage.removeItem("ns-auth");
      }
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((u: AuthUser, remember: boolean) => {
    const payload = {
      user: u,
      expires: remember ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
    };
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    storage.setItem("ns-auth", JSON.stringify(payload));
    otherStorage.removeItem("ns-auth");
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    const normalized = email.toLowerCase().trim();
    const record = MOCK_USERS[normalized];
    if (!record || record.password !== password) {
      throw new Error("Invalid email or password");
    }
    persist(record.user, !!remember);
    toast.success("Welcome back, " + record.user.name.split(" ")[0]);
    const roleHome: Record<string, string> = {
      Admin: "/admin",
      Photographer: "/dashboard",
      Enterprise: "/enterprise",
      Buyer: "/account",
    };
    const from = (location.state as { from?: string })?.from || roleHome[record.user.role] || "/account";
    navigate(from, { replace: true });
  }, [location.state, navigate, persist]);

  const signup = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const normalized = data.email.toLowerCase().trim();
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
    persist(newUser, false);
    toast.success("Account created", { description: "Welcome to NS CAPTURES!" });
    navigate("/account", { replace: true });
  }, [navigate, persist]);

  const logout = useCallback(() => {
    localStorage.removeItem("ns-auth");
    sessionStorage.removeItem("ns-auth");
    setUser(null);
    toast("Signed out");
    navigate("/signin", { replace: true });
  }, [navigate]);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;
    const { id: _id, role: _role, ...editableData } = data;
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
    persist(updated, remember);
    toast.success("Profile saved");
  }, [user, persist]);

  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user) throw new Error("Not authenticated");
    const record = MOCK_USERS[user.email];
    if (!record || record.password !== current) {
      throw new Error("Current password is incorrect");
    }
    record.password = next;
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
