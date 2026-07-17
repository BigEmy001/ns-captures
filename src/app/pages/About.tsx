import { Link } from "react-router";
import { ArrowRight, Globe, ShieldCheck, Target } from "lucide-react";

export function About() {
  return (
    <div className="min-h-screen bg-[#FAF9F5]">
      {/* Hero Section */}
      <section className="relative px-5 py-24 sm:px-8 lg:px-12 max-w-[1440px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#1e4a3f] mb-6 block">
              About NS CAPTURES
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#18211f] leading-[1.1] mb-8">
              Bridging independent photographic talent and global commercial enterprise.
            </h1>
            <p className="text-[#4a534e] text-lg leading-relaxed max-w-xl">
              Welcome to NS CAPTURES, a premier international visual media acquisition firm dedicated to bridging the gap between independent photographic talent and global commercial enterprise. We specialize in sourcing, evaluating, and licensing high-end imagery that commands attention, inspires audiences, and elevates modern corporate and editorial campaigns.
            </p>
          </div>
          <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop" 
              alt="Professional photographer setup"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Live Acquisition Ticker */}
      <section className="bg-[#182e27] py-6 border-b border-[#ececec]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-white">Acquisition Ticker</span>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-white/70">
              <div>Total Acquired Assets: <strong className="text-white">1,742,800+</strong></div>
              <div>Active Photographers: <strong className="text-white">12,400+ Globally</strong></div>
              <div>Last Disbursement: <strong className="text-white">£13,845 (35mm Architecture) – 14m ago</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="bg-white border-y border-[#ececec]">
        <div className="max-w-[1440px] mx-auto px-5 py-24 sm:px-8 lg:px-12 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-serif text-[#18211f] mb-6">Our Mission</h2>
            <p className="text-[#4a534e] leading-relaxed">
              Our mission is simple: to discover exceptional photographic perspectives from around the globe and integrate them into the international commercial marketplace. We believe that every image tells a story, and our goal is to provide talented photographers—from seasoned film enthusiasts utilizing traditional mediums to digital pioneers working with cutting-edge medium-format systems—with a direct pipeline to monetize their unique creative vision.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-serif text-[#18211f] mb-6">The NS CAPTURES Advantage</h2>
            <p className="text-[#4a534e] leading-relaxed">
              We pride ourselves on an efficient, transparent onboarding framework that treats creative work as a premium asset. By managing everything from initial structural evaluation to copyright compliance, secure legal encryption, and international banking clearance, we ensure a seamless transition from a single shutter click to high-value global licensing.
            </p>
            <p className="text-[#4a534e] leading-relaxed mt-4">
              Whether capturing timeless architecture, expansive landscapes, or raw editorial moments, NS CAPTURES is where artistic authenticity meets commercial demand.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="max-w-[1440px] mx-auto px-5 py-24 sm:px-8 lg:px-12">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif text-[#18211f] mb-4">What We Do</h2>
          <p className="text-[#4a534e]">At NS CAPTURES, we manage a rigorous and sophisticated digital asset pipeline.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-[#ececec] hover:shadow-xl transition-shadow duration-300">
            <Globe className="size-10 text-[#1e4a3f] mb-6" />
            <h3 className="text-xl font-semibold text-[#18211f] mb-4">Talent Acquisition & Global Sourcing</h3>
            <p className="text-sm text-[#6b716d] leading-relaxed">
              Through targeted community outreach, professional referrals, and open portfolio submissions, we identify emerging and established photographers who possess a distinct artistic voice.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-[#ececec] hover:shadow-xl transition-shadow duration-300">
            <Target className="size-10 text-[#1e4a3f] mb-6" />
            <h3 className="text-xl font-semibold text-[#18211f] mb-4">Meticulous Technical Evaluation</h3>
            <p className="text-sm text-[#6b716d] leading-relaxed">
              Our dedicated Content Evaluation Team conducts exhaustive physical and metadata verifications. We assess color fidelity, composition, dynamic range, and authentic authorship to ensure every piece in our curated portfolio meets strict international commercial standards.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-[#ececec] hover:shadow-xl transition-shadow duration-300">
            <ShieldCheck className="size-10 text-[#1e4a3f] mb-6" />
            <h3 className="text-xl font-semibold text-[#18211f] mb-4">Commercial Licensing & Placement</h3>
            <p className="text-sm text-[#6b716d] leading-relaxed">
              We package approved imagery for major global distribution, providing corporate clients, marketing agencies, and media outlets with legally secure, pristine visual content.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#12231f] text-white py-24 text-center px-5">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-5xl font-serif font-light">Join the Global Pipeline</h2>
          <p className="text-white/70 text-lg">
            Submit your portfolio today and turn your artistic vision into high-value commercial assets.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link 
              to="/contribute" 
              className="bg-white text-[#12231f] px-8 py-3.5 rounded-full font-semibold hover:bg-white/90 transition flex items-center gap-2"
            >
              Become a Contributor <ArrowRight className="size-4" />
            </Link>
            <Link 
              to="/contact" 
              className="border border-white/20 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-white/10 transition"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
