import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { EDITIONS_CHANGED_EVENT, isWeb3Activated, type Web3Role } from "../../data/editions";
import { Web3ActivationModal } from "./Web3Onboarding";

/**
 * Gate for actions that need Web3 switched on. `requireWeb3(role, action)` runs the
 * action straight away when the account is ready, or opens the onboarding and runs it
 * once they finish. Render `activationModal` once in the page.
 */
export function useWeb3Activation() {
  const { user } = useAuth();
  const [pending, setPending] = useState<{ role: Web3Role; action: () => void } | null>(null);
  const [, setRevision] = useState(0);

  // Re-render when activation changes here or in another tab
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener(EDITIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EDITIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const requireWeb3 = (role: Web3Role, action: () => void) => {
    if (!user || isWeb3Activated(user.id, role)) {
      action();
      return;
    }
    setPending({ role, action });
  };

  const activationModal =
    user && pending ? (
      <Web3ActivationModal
        user={user}
        role={pending.role}
        onClose={() => setPending(null)}
        onComplete={() => {
          setPending(null);
          pending.action();
        }}
      />
    ) : null;

  return { isActivated: user ? isWeb3Activated(user.id) : false, requireWeb3, activationModal };
}
