import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Upload, CheckCircle, AlertTriangle, ShieldCheck, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadVerificationDocument, fetchMyVerificationDocument, payVerificationFee, fetchAdminPaymentMethods, fetchSiteSettings, type AdminPaymentMethod } from "../data/db";

export function GlobalVerificationModal() {
  const { user, updateProfile } = useAuth();
  const [activeStep, setActiveStep] = useState<"upload" | "pay">("upload");
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  
  // App Config State
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethod[]>([]);
  const [contactLink, setContactLink] = useState<string>("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  // Upload State
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [occupation, setOccupation] = useState("");
  const [uploadDocType, setUploadDocType] = useState<"passport" | "driver_license" | "national_id">("passport");
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Payment State
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAdminPaymentMethods(),
      fetchSiteSettings()
    ]).then(([methods, settings]) => {
      setPaymentMethods(methods);
      setContactLink(settings.contactLink || "");
      if (methods.length > 0) setSelectedMethodId(methods[0].id);
    }).catch(console.error);

    if (user?.role === "Photographer" && user?.verificationStatus === "unverified") {
      fetchMyVerificationDocument(user.id).then((doc) => {
        if (doc) {
          setActiveStep("pay");
        }
        setIsLoadingDoc(false);
      }).catch(() => {
        setIsLoadingDoc(false);
      });
    } else {
      setIsLoadingDoc(false);
    }
  }, [user]);

  // Only render for photographers who are NOT verified
  if (!user || user.role === "Admin" || user.role !== "Photographer" || user.verificationStatus === "verified") {
    return null;
  }

  const handleUploadSubmit = async () => {
    if (!uploadDocFile) { toast.error("Please select an ID document to upload"); return; }
    if (!phone || !dob || !occupation) { toast.error("Please fill all KYC details"); return; }
    if (!uploadDocNumber) { toast.error("Please enter the document number"); return; }
    
    setIsUploading(true);
    try {
      await uploadVerificationDocument(user.id, uploadDocType, uploadDocNumber, uploadDocFile, {
        phone, dob, occupation
      });
      toast.success("Document uploaded successfully.");
      setActiveStep("pay");
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl border border-[#ececec] max-h-[90vh] overflow-y-auto">
        
        {user.verificationStatus === "pending" && (
          <div className="text-center py-8">
            <div className="mx-auto bg-[#fff8e6] text-[#b38600] rounded-full p-4 w-16 h-16 flex items-center justify-center mb-6">
              <CheckCircle className="size-8" />
            </div>
            <h2 className="text-2xl font-serif text-[#18211f] font-semibold mb-3">Verification Pending</h2>
            <p className="text-[#59645f] leading-relaxed">
              Your identity documents and payment have been received. An administrator is currently reviewing your application. You will be notified once approved.
            </p>
          </div>
        )}

        {user.verificationStatus === "rejected" && (
          <div className="text-center py-8">
            <div className="mx-auto bg-[#fff0f0] text-[#e63946] rounded-full p-4 w-16 h-16 flex items-center justify-center mb-6">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-2xl font-serif text-[#18211f] font-semibold mb-3">Verification Rejected</h2>
            <p className="text-[#59645f] leading-relaxed">
              We were unable to verify your account with the provided information. Please contact support to resolve this issue.
            </p>
          </div>
        )}

        {user.verificationStatus === "unverified" && (
          <>
            <div className="text-center mb-8">
              <div className="mx-auto bg-[#f0f4f2] text-[#1e4a3f] rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
                <ShieldCheck className="size-8" />
              </div>
              <h2 className="text-2xl font-serif text-[#18211f] font-semibold mb-2">Verify Your Account</h2>
              <p className="text-[#59645f]">Complete your verification to unlock your photographer dashboard and start monetizing your work.</p>
            </div>

            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${activeStep === "upload" ? "bg-[#1e4a3f] text-white" : "bg-[#1e4a3f]/10 text-[#1e4a3f]"}`}>1</div>
                <div className={`h-1 w-12 rounded-full ${activeStep === "pay" ? "bg-[#1e4a3f]" : "bg-[#ececec]"}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${activeStep === "pay" ? "bg-[#1e4a3f] text-white" : "bg-[#ececec] text-[#a4aca8]"}`}>2</div>
              </div>
            </div>

            {activeStep === "upload" && (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">Phone Number</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40" placeholder="+1 234 567 8900" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">Date of Birth</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">Occupation</label>
                  <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40" placeholder="e.g. Freelance Photographer" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">ID Type</label>
                    <select value={uploadDocType} onChange={(e: any) => setUploadDocType(e.target.value)} className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40">
                      <option value="passport">Passport</option>
                      <option value="driver_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">ID Number</label>
                    <input type="text" value={uploadDocNumber} onChange={(e) => setUploadDocNumber(e.target.value)} className="w-full rounded-xl border border-[#ececec] bg-[#f8f9f7] px-4 py-2.5 text-sm outline-none transition focus:border-[#1e4a3f]/40" placeholder="A12345678" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-2 block">Upload ID Document</label>
                  <label className="mt-1 flex items-center justify-center gap-2 p-5 border-2 border-dashed border-[#ececec] rounded-xl hover:border-[#1e4a3f]/40 transition-colors cursor-pointer bg-[#f8f9f7]">
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)} />
                    {uploadDocFile ? (
                      <span className="text-sm text-[#1e4a3f] font-medium">{uploadDocFile.name}</span>
                    ) : (
                      <span className="text-sm text-[#6b716d] flex items-center gap-2">
                        <Upload className="size-4" /> Click to upload image or PDF
                      </span>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="w-full mt-4 rounded-full bg-[#1e4a3f] py-3 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Uploading..." : "Continue to Payment"}
                </button>
              </div>
            )}

            {activeStep === "pay" && (
              <form onSubmit={handlePaymentSubmit} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-[#f8f9f7] p-5 rounded-2xl border border-[#ececec] mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#59645f] font-medium">One-time Verification Fee</span>
                    <span className="text-xl font-serif font-bold text-[#18211f]">£247.00</span>
                  </div>
                  <p className="text-xs text-[#758078]">This fee covers the background check and lifetime platform access.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#59645f] uppercase tracking-wider mb-3 block">Select Payment Method</label>
                  {paymentMethods.length === 0 ? (
                    <div className="p-4 border border-[#ececec] rounded-xl text-sm text-[#6b716d] text-center bg-[#f8f9f7]">
                      No payment methods configured. Please contact support.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.filter(m => m.enabled).map((method) => (
                        <div 
                          key={method.id} 
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`cursor-pointer border rounded-xl p-4 transition-all ${
                            selectedMethodId === method.id 
                              ? "border-[#1e4a3f] bg-[#f0f4f2]" 
                              : "border-[#ececec] bg-white hover:border-[#1e4a3f]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethodId === method.id ? "border-[#1e4a3f]" : "border-[#ececec]"}`}>
                                {selectedMethodId === method.id && <div className="w-2 h-2 rounded-full bg-[#1e4a3f]" />}
                              </div>
                              <span className="font-semibold text-[#18211f] text-sm">{method.name}</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider bg-white border border-[#ececec] px-2 py-0.5 rounded-full">{method.methodType}</span>
                          </div>
                          
                          {selectedMethodId === method.id && (
                            <div className="mt-3 pt-3 border-t border-[#1e4a3f]/10 animate-in slide-in-from-top-2 duration-200">
                              <p className="text-[10px] font-mono tracking-wider text-[#758078] uppercase mb-1">Payment Details</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 bg-white border border-[#ececec] p-2 rounded text-xs text-[#1e4a3f] break-all">
                                  {method.details}
                                </code>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(method.details); toast.success("Copied to clipboard!"); }}
                                  className="p-2 border border-[#ececec] rounded bg-white hover:bg-[#f8f9f7] text-[#6b716d] transition"
                                  title="Copy Details"
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

                <div className="pt-4 border-t border-[#ececec]">
                  <p className="text-xs text-[#6b716d] mb-4 text-center">After making your payment to the details above, click "I Have Paid" below to submit your application for review.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    {contactLink && (
                      <a 
                        href={contactLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-white border border-[#ececec] text-[#18211f] text-sm font-semibold py-3.5 rounded-full hover:bg-[#f8f9f7] transition flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="size-4 text-[#1e4a3f]" />
                        Contact Admin
                      </a>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isPaying || !selectedMethodId}
                      className="flex-1 bg-[#1e4a3f] py-3.5 text-sm font-semibold text-white rounded-full transition hover:bg-[#123b31] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
