import { useState, useEffect } from "react";
import {
  Upload, DollarSign, Globe, BadgeCheck, ArrowRight, ShieldCheck,
  CheckCircle, HelpCircle, Phone, Mail, FileText, ChevronDown, Award, Clock
} from "lucide-react";
import { toast } from "sonner";
import { Eyebrow, PartnerButton } from "../components/ui";
import { createContributorSubmission, logActivity } from "../data/db";
import { sendContributorAcknowledgment, sendAdminNotification } from "../../lib/email";
import { escapeHtml, isValidEmail, isValidHttpsUrl, isValidPhone, normalizeEmail } from "../../lib/validation";

const countriesList = [
  "United Kingdom", "United States", "Canada", "Germany", "France", 
  "South Africa", "Nigeria", "Kenya", "Ghana", "Senegal", 
  "United Arab Emirates", "Australia", "Japan", "Brazil", "India", "Others"
];

export function Contribute() {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [preferredChannel, setPreferredChannel] = useState("WhatsApp");
  const [invitationCode, setInvitationCode] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [gearDescription, setGearDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Live Ticker State (Simulating live stats)
  const [lastDisbursedTime, setLastDisbursedTime] = useState(14);
  useEffect(() => {
    const interval = setInterval(() => {
      setLastDisbursedTime((prev) => (prev > 1 ? prev - 1 : 59));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = phone.trim();
    const cleanPortfolio = portfolioLink.trim();
    const cleanGear = gearDescription.trim();
    const cleanInvitation = invitationCode.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanPortfolio || !cleanGear) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 120) {
      toast.error("Use a valid full name between 2 and 120 characters.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      toast.error("Please enter a valid phone number with country code.");
      return;
    }
    if (!isValidHttpsUrl(cleanPortfolio)) {
      toast.error("Portfolio link must be a valid HTTPS URL.");
      return;
    }
    if (cleanGear.length < 20 || cleanGear.length > 800) {
      toast.error("Gear description should be between 20 and 800 characters.");
      return;
    }
    if (cleanInvitation.length > 64) {
      toast.error("Invitation code is too long.");
      return;
    }

    setSubmitting(true);
    try {
      const stored = await createContributorSubmission({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        country,
        preferredChannel,
        invitationCode: cleanInvitation,
        portfolioLink: cleanPortfolio,
        gearDescription: cleanGear,
      });

      if (!stored) {
        throw new Error("Unable to store submission");
      }

      // 1. Log the full portfolio application details in system logs
      await logActivity({
        userId: `CONTRIBUTE-${cleanEmail}`,
        type: "contribute",
        title: "Full Portfolio Submission",
        desc: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          country,
          preferredChannel,
          invitationCode: cleanInvitation,
          portfolioLink: cleanPortfolio,
          gearDescription: cleanGear
        }, null, 2)
      });

      // 2. Trigger the automated brand-acknowledgement email to the contributor
      await sendContributorAcknowledgment(cleanEmail, cleanName);

      const safeName = escapeHtml(cleanName);
      const safeEmail = escapeHtml(cleanEmail);
      const safePhone = escapeHtml(cleanPhone);
      const safeCountry = escapeHtml(country);
      const safeChannel = escapeHtml(preferredChannel);
      const safeInvite = escapeHtml(cleanInvitation || "Not provided");
      const safePortfolio = escapeHtml(cleanPortfolio);
      const safeGear = escapeHtml(cleanGear);

      // 3. Trigger administrative notification with complete application details
      const adminMessage = `
        <p>A new photographer has submitted a full portfolio for technical assessment and valuation:</p>
        <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e0e0e0; font-family: sans-serif; font-size: 14px; margin-top: 15px;">
          <tr style="background-color: #f7f7f7;">
            <td width="30%" style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Full Legal Name:</td>
            <td style="border-bottom: 1px solid #e0e0e0;">${safeName}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Email Address:</td>
            <td style="border-bottom: 1px solid #e0e0e0;">${safeEmail}</td>
          </tr>
          <tr style="background-color: #f7f7f7;">
            <td style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Phone Number:</td>
            <td style="border-bottom: 1px solid #e0e0e0;">${safePhone}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Country of Residence:</td>
            <td style="border-bottom: 1px solid #e0e0e0;">${safeCountry}</td>
          </tr>
          <tr style="background-color: #f7f7f7;">
            <td style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Preferred Channel:</td>
            <td style="border-bottom: 1px solid #e0e0e0;">${safeChannel}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Invitation Code:</td>
            <td style="border-bottom: 1px solid #e0e0e0;">${safeInvite}</td>
          </tr>
          <tr style="background-color: #f7f7f7;">
            <td style="font-weight: bold; border-bottom: 1px solid #e0e0e0;">Portfolio Folder:</td>
            <td style="border-bottom: 1px solid #e0e0e0;"><a href="${safePortfolio}" target="_blank" rel="noopener noreferrer" style="color: #1e4a3f; font-weight: bold; text-decoration: underline;">Open Link</a></td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Gear &amp; Medium:</td>
            <td>${safeGear}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">Review this portfolio tracing metadata, dynamic range and composition to determine pricing tier placement.</p>
      `;
      
      await sendAdminNotification(`Portfolio Submitted: ${cleanName}`, adminMessage);

      toast.success("Portfolio Submitted successfully!");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit portfolio. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fcfcfa] text-[#18211f]">
      {/* 1. Header & Live Acquisition Ticker */}
      <section className="bg-[#182e27] text-[#f4f1e9] py-14 px-5 sm:px-8 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#17372f]/80 to-transparent" />
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/10 pb-6 mb-8">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase">Acquisition Ticker</span>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-white/70">
              <div>Total Assets: <strong className="text-white">1,742,800+</strong></div>
              <div>Active Photographers: <strong className="text-white">12,400+ Globally</strong></div>
              <div>Last Disbursement: <strong className="text-white">£13,845 (35mm Architecture) – {lastDisbursedTime}m ago</strong></div>
            </div>
          </div>
          
          <p className="font-mono text-xs tracking-[0.24em] text-white/50">ACQUISITION & CURATION</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl sm:text-6xl leading-[1.05] tracking-tight">
            Acquire & License High-End Visual Assets
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Bridging the gap between independent photographic talent and global commercial enterprise. Sourcing, evaluating, and licensing imagery that inspires audiences and elevates campaign aesthetics.
          </p>
        </div>
      </section>

      {/* 2. About NS CAPTURES & Our Mission */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 grid gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow>ABOUT NS CAPTURES</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-tight">
            Bridging Artistry & Global Commercial Enterprise
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[#59645f]">
            Welcome to NS CAPTURES, a premier international visual media acquisition firm dedicated to bridging the gap between independent photographic talent and global commercial enterprise. We specialize in sourcing, evaluating, and licensing high-end imagery that commands attention, inspires audiences, and elevates modern corporate and editorial campaigns.
          </p>
          
          <h3 className="mt-8 font-serif text-xl text-[#1e4a3f]">Our Mission</h3>
          <p className="mt-3 text-sm leading-relaxed text-[#59645f]">
            Our mission is simple: to discover exceptional photographic perspectives from around the globe and integrate them into the international commercial marketplace. We believe that every image tells a story, and our goal is to provide talented photographers—from seasoned film enthusiasts utilizing traditional mediums to digital pioneers working with cutting-edge medium-format systems—with a direct pipeline to monetize their unique creative vision.
          </p>
        </div>

        <div className="bg-[#f0ece6] p-8 rounded-3xl border border-[#ececec]">
          <Eyebrow>THE ADVANTAGE</Eyebrow>
          <h3 className="mt-3 font-serif text-2xl text-[#18211f]">A Streamlined Digital Asset Pipeline</h3>
          
          <div className="mt-8 space-y-6">
            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-[#1e4a3f] text-white rounded-full flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="font-serif text-lg">Talent Acquisition & Sourcing</h4>
                <p className="text-sm text-[#59645f] mt-1">Identify emerging and established photographers who possess a distinct, premium artistic voice.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-[#1e4a3f] text-white rounded-full flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="font-serif text-lg">Meticulous Technical Evaluation</h4>
                <p className="text-sm text-[#59645f] mt-1">Exhaustive metadata, composition, sharpness, color fidelity and authentic authorship checks by our dedicated Content Evaluation Team.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 bg-[#1e4a3f] text-white rounded-full flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="font-serif text-lg">Commercial Placement & Licensing</h4>
                <p className="text-sm text-[#59645f] mt-1">Legally secure, pristine visual content packaged directly for major international agencies, corporate partners and publishers.</p>
              </div>
            </div>
          </div>
          
          <p className="mt-8 text-xs leading-relaxed text-[#758078] italic">
            By managing structural evaluation, copyright assignment compliance, legal encryption, and international banking clearing, we guarantee high-value, transparent licensing.
          </p>
        </div>
      </section>

      {/* 3. Our Valuation Framework */}
      <section className="bg-[#f6f5f0] border-y border-[#ececec] py-20 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="text-center max-w-3xl mx-auto">
            <Eyebrow>VALUATION FRAMEWORK</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Tier-Structured Acquisition Valuations</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#59645f]">
              We acquire digital and film assets based on commercial demand, technical execution, and artistic composition. Once submitted, your portfolio is evaluated and placed into our three pricing tiers:
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Tier 1 */}
            <div className="bg-white border border-[#ececec] p-8 rounded-2xl ns-shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] tracking-wider uppercase text-[#8a8f89]">Acquisition Tier 01</span>
                <h3 className="font-serif text-2xl text-[#18211f] mt-2">Standard Commercial</h3>
                <p className="text-sm text-[#59645f] mt-4 leading-relaxed">
                  Clean composition, clear sharpness, and high utility for digital media and corporate marketing.
                </p>
              </div>
              <div className="border-t border-[#ececec] pt-6 mt-6">
                <span className="text-xs text-[#8a8f89]">Valuation Per Photo</span>
                <div className="text-3xl font-serif font-bold text-[#1e4a3f] mt-1">£40 – £239</div>
              </div>
            </div>

            {/* Tier 2 */}
            <div className="bg-white border-2 border-[#1e4a3f] p-8 rounded-2xl relative flex flex-col justify-between shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1e4a3f] px-4 py-1 text-[9px] font-mono tracking-wider text-white uppercase">High-Demand</div>
              <div>
                <span className="font-mono text-[10px] tracking-wider uppercase text-[#1e4a3f]">Acquisition Tier 02</span>
                <h3 className="font-serif text-2xl text-[#18211f] mt-2">Premium Editorial</h3>
                <p className="text-sm text-[#59645f] mt-4 leading-relaxed">
                  Exceptional dynamic range, advanced lighting, or specialized subject matter (e.g., medium format, premium drone, specialized architecture).
                </p>
              </div>
              <div className="border-t border-[#ececec] pt-6 mt-6">
                <span className="text-xs text-[#8a8f89]">Valuation Per Photo</span>
                <div className="text-3xl font-serif font-bold text-[#1e4a3f] mt-1">£240 – £419</div>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-white border border-[#ececec] p-8 rounded-2xl ns-shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] tracking-wider uppercase text-[#8a8f89]">Acquisition Tier 03</span>
                <h3 className="font-serif text-2xl text-[#18211f] mt-2">Director's Choice</h3>
                <p className="text-sm text-[#59645f] mt-4 leading-relaxed">
                  Rare, high-demand aesthetics, immaculate metadata validation, or pristine film scans with unique artistic value.
                </p>
              </div>
              <div className="border-t border-[#ececec] pt-6 mt-6">
                <span className="text-xs text-[#8a8f89]">Valuation Per Photo</span>
                <div className="text-3xl font-serif font-bold text-[#1e4a3f] mt-1">£420 – £570</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Submission & Evaluation Workflow */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow>ONBOARDING PIPELINE</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Submission &amp; Evaluation Workflow</h2>
          <p className="mt-4 text-sm text-[#59645f]">
            Understand the transition from initial digital asset submission to legal contract clearance and final disbursement payout.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "Step 1",
              title: "Open Application & Intake",
              desc: "Submit your professional details, creative handles, and a curated selection of your work (Minimum of 47 images) via a secure cloud directory link (Google Drive) to our intake department."
            },
            {
              step: "Step 2",
              title: "Technical Assessment",
              desc: "Our Content Evaluation Team reviews the collection for resolution, digital metadata integrity, originality, and commercial licensing viability within 3 business days."
            },
            {
              step: "Step 3",
              title: "Verification & Legal Compliance",
              desc: "Upon portfolio approval, you will be requested to execute a Contractual Ownership Statement alongside a first-time vendor registration to secure your payout routing."
            },
            {
              step: "Step 4",
              title: "Acquisition Settlement",
              desc: "Once administrative clearance is authorized by our partner law firm, the gross payment is disbursed directly to your designated international banking account."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-[#ececec] rounded-2xl p-6 relative shadow-sm">
              <div className="absolute top-6 right-6 font-mono text-xs text-[#1e4a3f] font-bold bg-[#1e4a3f]/10 px-2.5 py-1 rounded-full">{item.step}</div>
              <h3 className="font-serif text-xl text-[#18211f] pr-14 mt-2">{item.title}</h3>
              <p className="text-sm text-[#59645f] mt-4 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Intakes / Submission Form Card & Terms Summary */}
      <section className="bg-[#213e35] text-white py-20 px-5 sm:px-8 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#17372f]/80" />
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
            {/* Left Column: Form */}
            <div className="bg-white text-[#18211f] p-8 rounded-3xl shadow-2xl border border-white/10">
              <div className="border-b border-[#ececec] pb-6 mb-6">
                <h3 className="font-serif text-2xl text-[#1e4a3f]">Submit Your Portfolio</h3>
                <p className="text-xs text-[#59645f] mt-2">
                  Ready to partner with NS CAPTURES? Please fill out the formal acquisition intake form below. Ensure your cloud folder permissions are set to <strong className="text-[#1e4a3f]">\"Anyone with the link can view\"</strong> before submitting.
                </p>
              </div>

              {submitted ? (
                <div className="py-12 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 mb-6">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <h4 className="font-serif text-2xl text-[#18211f] font-semibold">Application Submitted Successfully</h4>
                  <p className="text-sm text-[#59645f] mt-3 max-w-md mx-auto">
                    We've sent a detailed confirmation to <strong className="text-[#18211f]">{email}</strong>. Our Content Evaluation Team will begin your Technical Assessment within 3 business days.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-8 rounded-full border border-[#1e4a3f] text-[#1e4a3f] px-6 py-2.5 text-xs font-semibold hover:bg-[#1e4a3f]/5 transition-colors"
                  >
                    Submit Another Portfolio
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        maxLength={120}
                        placeholder="John Doe"
                        className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        maxLength={254}
                        placeholder="john@example.com"
                        className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Phone Number (Include Country Code) *</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        inputMode="tel"
                        maxLength={20}
                        placeholder="+1 234 567 8900"
                        className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Country of Residence *</label>
                      <div className="relative">
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50 appearance-none cursor-pointer"
                        >
                          {countriesList.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-[#59645f] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Preferred Communication *</label>
                      <div className="relative">
                        <select
                          value={preferredChannel}
                          onChange={(e) => setPreferredChannel(e.target.value)}
                          className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50 appearance-none cursor-pointer"
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Telegram">Telegram</option>
                          <option value="Email">Email</option>
                          <option value="Phone">Phone</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-[#59645f] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Invitation / Reference Code</label>
                      <input
                        type="text"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        maxLength={64}
                        placeholder="Optional"
                        className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Portfolio Link (Google Drive / Dropbox) *</label>
                    <input
                      type="url"
                      required
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                      inputMode="url"
                      maxLength={2048}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono tracking-wider text-[#59645f] uppercase mb-2">Brief Description of Gear/Medium *</label>
                    <textarea
                      required
                      rows={3}
                      value={gearDescription}
                      onChange={(e) => setGearDescription(e.target.value)}
                      maxLength={800}
                      placeholder="e.g., Canon EOS R5 with standard L-series lenses, Mamiya 7II medium format with 80mm lens (35mm / 120 film scans)"
                      className="w-full bg-[#f8f8f6] border border-[#ececec] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e4a3f]/50 resize-none"
                    />
                  </div>

                  {/* Submission Agreement snippet */}
                  <div className="bg-[#f0ece6] rounded-2xl p-4 text-[11px] leading-relaxed text-[#59645f] border border-[#ececec]">
                    <strong>Submission Agreement:</strong> By clicking submit, you acknowledge that all submitted visual assets are your original intellectual property, free of unmentioned third-party claims. NS CAPTURES reserves the right to decline portfolios that fail to clear metadata verification. First-time vendors are subject to mandatory regulatory profile registration via our partner compliance law firm prior to any contract finalization.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#1e4a3f] text-white py-4 rounded-xl text-sm font-semibold tracking-wide hover:bg-[#152e23] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <span>Processing Application...</span>
                    ) : (
                      <>
                        <span>Submit Application for Evaluation</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Copy & Support Info */}
            <div className="flex flex-col justify-between py-4 text-white/90">
              <div className="space-y-6">
                <div>
                  <Eyebrow>INTAKE POLICIES</Eyebrow>
                  <h3 className="font-serif text-3xl text-white mt-2">Required Submissions</h3>
                  <p className="text-sm leading-relaxed text-white/70 mt-4">
                    For our Content Evaluation Team to properly verify authenticity, authorship, and dynamic range consistency, candidates are requested to submit a **minimum of 47 images** in their Google Drive folder.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-serif text-base text-white">Evaluation Timeline</h4>
                      <p className="text-xs text-white/60 mt-1">Assessment takes approximately 3 business days. You will be notified via your preferred contact channel.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-serif text-base text-white">Legal Tracing &amp; Verification</h4>
                      <p className="text-xs text-white/60 mt-1">Authorship tracking and metadata integrity checking are mandatory to protect licensees.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Get in Touch Section */}
              <div className="border-t border-white/15 pt-8 mt-8 space-y-4">
                <h4 className="font-serif text-xl text-white">Get in Touch</h4>
                <p className="text-xs text-white/70">Contact our corporate departments directly regarding active evaluations or registration status:</p>
                
                <div className="grid gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-300 shrink-0" />
                    <span>General Acquisition: <a href="mailto:sales@nscaptures.com" className="underline hover:text-white">sales@nscaptures.com</a></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-300 shrink-0" />
                    <span>Billing &amp; Compliance: <a href="mailto:paymentdesk@nscaptures.com" className="underline hover:text-white">paymentdesk@nscaptures.com</a></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-300 shrink-0" />
                    <span>Fast-Track Onboarding: <a href="https://wa.me/message/NSCAPTURES" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Connect via WhatsApp Support</a></span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Corporate Hours: Monday – Friday: 09:00 – 17:00 (GMT)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Block */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl text-[#18211f]">Frequently Asked Questions</h2>
          <p className="mt-4 text-sm text-[#59645f]">
            Addressing the key licensing, gear requirements and legal setup queries often raised by incoming photographers.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="bg-white border border-[#ececec] p-6 rounded-2xl ns-shadow-sm flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 bg-[#1e4a3f]/10 text-[#1e4a3f] rounded-full flex items-center justify-center mb-4">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-lg text-[#18211f]">What equipment is required?</h4>
              <p className="text-xs text-[#59645f] mt-3 leading-relaxed">
                We accept high-resolution digital imagery—ranging from APS-C to medium format systems—as well as clean, high-resolution physical film scans. The asset's composition and commercial readiness dictate the valuation more than the specific gear model.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#ececec] p-6 rounded-2xl ns-shadow-sm flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 bg-[#1e4a3f]/10 text-[#1e4a3f] rounded-full flex items-center justify-center mb-4">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-lg text-[#18211f]">Can registration fees be deducted?</h4>
              <p className="text-xs text-[#59645f] mt-3 leading-relaxed">
                Due to strict international anti-money laundering frameworks and corporate accounting laws, gross acquisition disbursements cannot be mixed with administrative profile activations. The activation invoice must be cleared independently through our legal compliance partners before payout release.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#ececec] p-6 rounded-2xl ns-shadow-sm flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 bg-[#1e4a3f]/10 text-[#1e4a3f] rounded-full flex items-center justify-center mb-4">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-lg text-[#18211f]">Do I keep the copyright?</h4>
              <p className="text-xs text-[#59645f] mt-3 leading-relaxed">
                Our standard contract involves an exclusive commercial acquisition or an extensive international licensing transfer depending on the tier. Full details regarding copyright assignment are clearly laid out in your individualized agent contract prior to signing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Legal Compliance Footer Note */}
      <section className="bg-[#101e1a] border-t border-[#ececec]/10 py-12 px-5 sm:px-8 lg:px-12 text-white/50 text-[11px] leading-relaxed">
        <div className="mx-auto max-w-[1440px] grid gap-6 md:grid-cols-[1fr_2.5fr]">
          <div className="font-mono tracking-wider uppercase text-white/80">Regulatory Compliance Notice</div>
          <div>
            <p>
              NS CAPTURES operates under strict compliance with international copyright frameworks, digital asset monetization standards, and cross-border commercial trade regulations. All submitted portfolios undergo mandatory authorship tracing and metadata tracking to protect legal licensees. Vendor profile setup, secure asset encryption, and final payment disbursements are processed exclusively in tandem with certified legal counsel and corporate compliance clearing houses.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
