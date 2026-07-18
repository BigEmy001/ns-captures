import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export function VerificationWelcomeModal() {
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase appends #access_token=...&type=signup when returning from an email confirmation
    const hash = window.location.hash;
    if (hash && hash.includes("type=signup")) {
      setOpen(true);
      // Clean up the URL slightly for aesthetics without breaking Supabase's own parsing
      // Actually, Supabase will parse it, so we just show the modal.
    }
  }, []);

  const handleContinue = async () => {
    setIsSending(true);
    try {
      // 1. Get the session token to authenticate the API request
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // 2. Trigger the welcome email securely
        await fetch("/api/webhooks/welcome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          }
        });
      }
    } catch (err) {
      console.error("Failed to trigger welcome email:", err);
    } finally {
      setIsSending(false);
      setOpen(false);
      
      // Navigate to dashboard
      navigate("/account");
      toast.success("Welcome to NS Captures!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-[#ffffff] border-[#ececec]">
        <DialogHeader className="flex flex-col items-center text-center sm:text-center mt-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1e4a3f]/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#1e4a3f]" />
          </div>
          <DialogTitle className="text-2xl font-bold text-[#18211f]">
            Email Confirmed!
          </DialogTitle>
          <p className="text-sm text-[#68706b] mt-2">
            Your email has been successfully verified. You now have full access to your account and the NS Captures platform.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleContinue}
            disabled={isSending}
            className="w-full rounded-full bg-[#1e4a3f] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#15342c] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSending ? "Loading..." : "Continue to Dashboard"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
