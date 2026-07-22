import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Copy,
  MessageCircle,
  X,
  Clock,
  FileCheck,
  CreditCard,
  CircleCheckBig,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import {
  uploadVerificationDocument,
  fetchMyVerificationDocument,
  payVerificationFee,
  fetchAdminPaymentMethods,
  fetchSiteSettings,
  type AdminPaymentMethod,
  type VerificationDocument,
} from "../data/db";

interface GlobalVerificationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function GlobalVerificationModal({ isOpen, onClose }: GlobalVerificationModalProps) {
  const { user, updateProfile } = useAuth();
  const [activeStep, setActiveStep] = useState<"upload" | "pay">("upload");
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [verificationDoc, setVerificationDoc] = useState<VerificationDocument | null>(null);

  // App Config State
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethod[]>([]);
  const [contactLink, setContactLink] = useState<string>("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  // Upload State
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [occupation, setOccupation] = useState("");
  const [uploadDocType, setUploadDocType] = useState<"passport" | "driver_license" | "national_id">(
    "passport",
  );
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Payment State
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    Promise.all([fetchAdminPaymentMethods(), fetchSiteSettings()])
      .then(([methods, settings]) => {
        setPaymentMethods(methods);
        setContactLink(settings.contactLink || "");
        if (methods.length > 0) setSelectedMethodId(methods[0].id);
      })
      .catch(console.error);

    if (user?.role === "Photographer" && user?.verificationStatus !== "verified") {
      fetchMyVerificationDocument(user.id)
        .then((doc) => {
          if (doc) {
            setVerificationDoc(doc);
            if (user.verificationStatus === "unverified") {
              setActiveStep("pay");
            }
          }
          setIsLoadingDoc(false);
        })
        .catch(() => {
          setIsLoadingDoc(false);
        });
    } else {
      setIsLoadingDoc(false);
    }
  }, [user]);

  // Only render for photographers who are NOT verified
  if (
    !user ||
    user.role === "Admin" ||
    user.role !== "Photographer" ||
    user.verificationStatus === "verified"
  ) {
    return null;
  }

  const handleUploadSubmit = async () => {
    if (!uploadDocFile) {
      toast.error("Please select an ID document to upload");
      return;
    }
    if (!phone || !dob || !occupation) {
      toast.error("Please fill all KYC details");
      return;
    }
    if (!uploadDocNumber) {
      toast.error("Please enter the document number");
      return;
    }

    setIsUploading(true);
    try {
      await uploadVerificationDocument(user.id, uploadDocType, uploadDocNumber, uploadDocFile, {
        phone,
        dob,
        occupation,
      });
      toast.success("Document uploaded successfully.");
      if (user.verificationStatus === "rejected") {
        await updateProfile({ verificationStatus: "pending" });
        toast.success("Verification resubmitted! Now pending review.");
        if (onClose) onClose();
      } else {
        setActiveStep("pay");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethodId) {
      toast.error("Please select a payment method");
      return;
    }

    setIsPaying(true);
    try {
      await payVerificationFee(user.id);
      await updateProfile({ verificationStatus: "pending" });
      toast.success("Payment confirmed! Verification is now pending.");
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoadingDoc) return null;

  // Controlled mode: don't render if isOpen is explicitly false
  if (isOpen === false) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 max-w-xl w-full shadow-2xl border border-[#ececec] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full text-[#6b716d] hover:bg-[#f0f4f2] transition z-10"
            title="Close"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        )}

        {user.verificationStatus === "pending" && (
          <div className="py-4 sm:py-6">
            <div className="text-center mb-6 sm:mb-8">
              <div className="mx-auto bg-[#fff8e6] text-[#b38600] rounded-full p-3.5 sm:p-4 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-4 sm:mb-6">
                <Clock className="size-7 sm:size-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#18211f] font-semibold mb-2 sm:mb-3 px-2">
                Verification In Progress
              </h2>
              <p className="text-sm sm:text-base text-[#59645f] leading-relaxed px-2">
                Your documents and payment have been received. Our team is reviewing your
                application.
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-[#f8f9f7] rounded-2xl p-4 sm:p-5 mb-5 sm:mb-6 border border-[#ececec]/60">
              <p className="text-[10px] font-bold text-[#758078] uppercase tracking-wider mb-4">
                Verification Steps
              </p>
              <div className="space-y-0">
                {[
                  {
                    icon: <Upload className="size-4" />,
                    label: "Documents Submitted",
                    desc: "Identity document uploaded",
                    done: true,
                  },
                  {
                    icon: <CreditCard className="size-4" />,
                    label: "Payment Received",
                    desc: "£247 verification fee confirmed",
                    done: true,
                  },
                  {
                    icon: <FileCheck className="size-4" />,
                    label: "Under Review",
                    desc: "An administrator is verifying your documents",
                    done: false,
                    active: true,
                  },
                  {
                    icon: <CircleCheckBig className="size-4" />,
                    label: "Approved",
                    desc: "Full dashboard access unlocked",
                    done: false,
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.done
                            ? "bg-[#1e4a3f] text-white"
                            : step.active
                              ? "bg-[#fff8e6] text-[#b38600] ring-2 ring-[#b38600]/20"
                              : "bg-[#ececec] text-[#a4aca8]"
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle className="size-4" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      {i < 3 && (
                        <div
                          className={`w-0.5 h-6 ${step.done ? "bg-[#1e4a3f]" : "bg-[#ececec]"}`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-sm font-semibold ${
                          step.done || step.active ? "text-[#18211f]" : "text-[#a4aca8]"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          step.done || step.active ? "text-[#6b716d]" : "text-[#a4aca8]"
                        }`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submission details */}
            {verificationDoc && (
              <div className="bg-white border border-[#ececec] rounded-xl p-4 mb-5 sm:mb-6">
                <p className="text-[10px] font-bold text-[#758078] uppercase tracking-wider mb-3">
                  Your Submission
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#6b716d]">Document type</span>
                    <span className="text-xs font-medium text-[#18211f] capitalize">
                      {verificationDoc.documentType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#6b716d]">Submitted</span>
                    <span className="text-xs font-medium text-[#18211f]">
                      {new Date(verificationDoc.submittedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#6b716d]">Payment</span>
                    <span className="text-xs font-medium text-[#18211f]">£247.00 confirmed</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#6b716d]">Status</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      Under Review
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="bg-[#f0f4f2] rounded-xl p-4 mb-5 sm:mb-6 border border-[#1e4a3f]/10">
              <p className="text-[10px] font-bold text-[#1e4a3f] uppercase tracking-wider mb-2">
                What happens next?
              </p>
              <ul className="space-y-1.5">
                <li className="text-xs text-[#59645f] flex items-start gap-2">
                  <span className="text-[#1e4a3f] mt-0.5">•</span>
                  An administrator will review your identity document and payment within 24–48 hours.
                </li>
                <li className="text-xs text-[#59645f] flex items-start gap-2">
                  <span className="text-[#1e4a3f] mt-0.5">•</span>
                  You will receive an email notification once your verification is approved or if
                  additional information is needed.
                </li>
                <li className="text-xs text-[#59645f] flex items-start gap-2">
                  <span className="text-[#1e4a3f] mt-0.5">•</span>
                  Once approved, you'll have full access to your photographer dashboard, portfolio,
                  and payout tools.
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {contactLink && (
                <a
                  href={contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-white border border-[#ececec] text-[#18211f] text-sm font-semibold py-3 rounded-full hover:bg-[#f8f9f7] transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="size-4 text-[#1e4a3f]" />
                  Contact Support
                </a>
              )}
              <a
                href="mailto:support@nscaptures.com"
                className="flex-1 bg-white border border-[#ececec] text-[#18211f] text-sm font-semibold py-3 rounded-full hover:bg-[#f8f9f7] transition flex items-center justify-center gap-2"
              >
                <Mail className="size-4 text-[#1e4a3f]" />
                Email Us
              </a>
            </div>
          </div>
        )}

        {(user.verificationStatus === "rejected" || user.verificationStatus === "unverified") && (
          <>
            <div className="text-center mb-6 sm:mb-8 px-1">
              <div
                className={`mx-auto rounded-full p-3.5 sm:p-4 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-4 sm:mb-6 ${
                  user.verificationStatus === "rejected"
                    ? "bg-[#fff0f0] text-[#e63946]"
                    : "bg-[#f0f4f2] text-[#1e4a3f]"
                }`}
              >
                {user.verificationStatus === "rejected" ? (
                  <AlertTriangle className="size-7 sm:size-8" />
                ) : (
                  <ShieldCheck className="size-7 sm:size-8" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#18211f] font-semibold mb-2 sm:mb-3">
                {user.verificationStatus === "rejected"
                  ? "Verification Rejected"
                  : "Verify Your Account"}
              </h2>
              <p className="text-sm sm:text-base text-[#59645f] leading-relaxed px-1">
                {user.verificationStatus === "rejected"
                  ? "Your previous verification was not approved. Please review the admin feedback and resubmit with corrected information."
                  : "Complete your verification to unlock your photographer dashboard and start monetizing your work."}
              </p>
            </div>

            <div className="flex items-center justify-center mb-6 sm:mb-8">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div
                  className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs sm:text-sm ${activeStep === "upload" ? "bg-[#1e4a3f] text-white" : "bg-[#1e4a3f]/10 text-[#1e4a3f]"}`}
                >
                  1
                </div>
                <div
                  className={`h-1 w-8 sm:w-12 rounded-full ${activeStep === "pay" ? "bg-[#1e4a3f]" : "bg-[#ececec]"}`}
                />
                <div
                  className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs sm:text-sm ${activeStep === "pay" ? "bg-[#1e4a3f] text-white" : "bg-[#ececec] text-[#a4aca8]"}`}
                >
                  2
                </div>
              </div>
            </div>

            {activeStep === "upload" && (
              <div className="space-y-4 sm:space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-3 sm:px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-3 sm:px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-3 sm:px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40"
                    placeholder="e.g. Freelance Photographer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">
                      ID Type
                    </label>
                    <select
                      value={uploadDocType}
                      onChange={(e: any) => setUploadDocType(e.target.value)}
                      className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-3 sm:px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40"
                    >
                      <option value="passport">Passport</option>
                      <option value="driver_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">
                      ID Number
                    </label>
                    <input
                      type="text"
                      value={uploadDocNumber}
                      onChange={(e) => setUploadDocNumber(e.target.value)}
                      className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-3 sm:px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40"
                      placeholder="A12345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">
                    Upload ID Document
                  </label>
                  <label className="mt-1 flex items-center justify-center gap-2 p-4 sm:p-5 border-2 border-dashed border-[#ececec] rounded-xl hover:border-[#1e4a3f]/40 transition-colors cursor-pointer bg-[#f8f9f7]">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                    />
                    {uploadDocFile ? (
                      <span className="text-sm text-[#1e4a3f] font-medium break-all text-center px-2">
                        {uploadDocFile.name}
                      </span>
                    ) : (
                      <span className="text-sm text-[#6b716d] flex items-center gap-2 text-center">
                        <Upload className="size-4 flex-shrink-0" /> Click to upload image or PDF
                      </span>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="w-full mt-2 sm:mt-4 rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Uploading..." : "Continue to Payment"}
                </button>
              </div>
            )}

            {activeStep === "pay" && (
              <form
                onSubmit={handlePaymentSubmit}
                className="space-y-4 sm:space-y-5 animate-in slide-in-from-right-4 duration-300"
              >
                <div className="bg-[#f8f9f7] p-4 sm:p-5 rounded-2xl border border-[#ececec] mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs sm:text-sm text-[#59645f] font-medium">
                      One-time Verification Fee
                    </span>
                    <span className="text-lg sm:text-xl font-serif font-bold text-[#18211f]">
                      £247.00
                    </span>
                  </div>
                  <p className="text-xs text-[#758078]">
                    This fee covers the background check and lifetime platform access.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-3 block">
                    Select Payment Method
                  </label>
                  {paymentMethods.length === 0 ? (
                    <div className="p-4 border border-[#ececec] rounded-xl text-sm text-[#6b716d] text-center bg-[#f8f9f7]">
                      No payment methods configured. Please contact support.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods
                        .filter((m) => m.enabled)
                        .map((method) => (
                          <div
                            key={method.id}
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`cursor-pointer border rounded-xl p-3 sm:p-4 transition-all ${
                              selectedMethodId === method.id
                                ? "border-[#1e4a3f] bg-[#f0f4f2]"
                                : "border-[#ececec] bg-white hover:border-[#1e4a3f]/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedMethodId === method.id ? "border-[#1e4a3f]" : "border-[#ececec]"}`}
                                >
                                  {selectedMethodId === method.id && (
                                    <div className="w-2 h-2 rounded-full bg-[#1e4a3f]" />
                                  )}
                                </div>
                                <span className="font-semibold text-[#18211f] text-sm truncate">
                                  {method.name}
                                </span>
                              </div>
                              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider bg-white border border-[#ececec] px-2 py-0.5 rounded-full flex-shrink-0">
                                {method.methodType}
                              </span>
                            </div>

                            {selectedMethodId === method.id && (
                              <div className="mt-3 pt-3 border-t border-[#1e4a3f]/10 animate-in slide-in-from-top-2 duration-200">
                                <p className="text-[9px] sm:text-[10px] font-mono tracking-wider text-[#758078] uppercase mb-1">
                                  Payment Details
                                </p>
                                <div className="space-y-1">
                                  {method.methodType === "bank" &&
                                  method.details &&
                                  (method.details.bankName ||
                                    method.details.iban ||
                                    method.details.swift ||
                                    method.details.accountNumber) ? (
                                    <>
                                      {method.details.bankName && (
                                        <p className="text-xs text-[#18211f]">
                                          Bank:{" "}
                                          <span className="font-medium">
                                            {String(method.details.bankName)}
                                          </span>
                                        </p>
                                      )}
                                      {method.details.iban && (
                                        <p className="text-xs text-[#18211f] font-mono">
                                          IBAN: {String(method.details.iban)}
                                        </p>
                                      )}
                                      {method.details.swift && (
                                        <p className="text-xs text-[#18211f] font-mono">
                                          SWIFT: {String(method.details.swift)}
                                        </p>
                                      )}
                                      {method.details.accountNumber && !method.details.iban && (
                                        <p className="text-xs text-[#18211f] font-mono">
                                          Acc: {String(method.details.accountNumber)}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <code className="flex-1 bg-white border border-[#ececec] p-2 rounded text-xs text-[#1e4a3f] break-all block">
                                      {typeof method.details === "object"
                                        ? method.details?.value ||
                                          method.details?.email ||
                                          method.details?.address ||
                                          JSON.stringify(method.details)
                                        : String(method.details)}
                                    </code>
                                  )}
                                </div>
                                <div className="flex items-start gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const text =
                                        typeof method.details === "object"
                                          ? method.details?.value ||
                                            method.details?.email ||
                                            method.details?.address ||
                                            JSON.stringify(method.details)
                                          : String(method.details);
                                      navigator.clipboard.writeText(text);
                                      toast.success("Copied to clipboard!");
                                    }}
                                    className="p-2 border border-[#ececec] rounded bg-white hover:bg-[#f8f9f7] text-[#6b716d] transition flex-shrink-0"
                                    title="Copy Details"
                                    aria-label="Copy details"
                                  >
                                    <Copy className="size-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 sm:pt-4 border-t border-[#ececec]">
                  <p className="text-xs text-[#6b716d] mb-3 sm:mb-4 text-center px-2">
                    After making your payment to the details above, click "I Have Paid" below to
                    submit your application for review.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {contactLink && (
                      <a
                        href={contactLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-white border border-[#ececec] text-[#18211f] text-sm font-semibold py-3 sm:py-3.5 rounded-full hover:bg-[#f8f9f7] transition flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="size-4 text-[#1e4a3f]" />
                        Contact Admin
                      </a>
                    )}

                    <button
                      type="submit"
                      disabled={isPaying || !selectedMethodId}
                      className="flex-1 bg-[#1e4a3f] py-3 sm:py-3.5 text-sm font-semibold text-white rounded-full transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isPaying ? "Processing..." : "I Have Paid"}
                      <CheckCircle className="size-4" />
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
