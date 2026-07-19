import React, { useState } from "react";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (type: string, number: string, file: File) => Promise<void>;
}

export function VerificationModal({ isOpen, onClose, onVerify }: VerificationModalProps) {
  const [docType, setDocType] = useState("passport");
  const [docNumber, setDocNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    try {
      await onVerify(docType, docNumber, file);
      onClose();
    } catch (err) {
      // Error handling is typically done in the parent or via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[#ececec]">
          <h2 className="font-serif text-xl font-semibold text-[#18211f]">Verify Identity</h2>
          <button
            onClick={onClose}
            className="text-[#6b716d] hover:text-[#18211f] transition-colors p-1 rounded-full hover:bg-[#f2f2f2]"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="bg-[#f0f4f1] p-4 rounded-xl text-sm text-[#1e4a3f] flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
            <p>
              To protect our community and comply with financial regulations, we require a valid government-issued ID.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#18211f]">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-[#ececec] rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
              required
            >
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
              <option value="national_id">National ID Card</option>
              <option value="other">Other Government ID</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#18211f]">Document Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. P12345678"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full border border-[#ececec] rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#18211f]">Upload Document Image</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#ececec] rounded-xl cursor-pointer bg-[#fafafa] hover:bg-[#f2f5f3] transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <FileText className="size-8 text-[#1e4a3f] mb-2" />
                    <p className="text-sm font-semibold text-[#18211f] truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-[#6b716d]">Click to replace</p>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-[#6b716d] mb-2" />
                    <p className="text-sm font-semibold text-[#18211f]">Click to upload</p>
                    <p className="text-xs text-[#6b716d]">JPEG, PNG, or PDF</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
              />
            </label>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!file || isSubmitting}
              className="w-full bg-[#1e4a3f] hover:bg-[#123b31] text-white rounded-full py-6 text-sm font-semibold"
            >
              {isSubmitting ? "Uploading..." : "Submit for Verification"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
