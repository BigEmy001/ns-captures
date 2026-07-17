import { Mail, MessageCircle, PhoneCall, Clock } from "lucide-react";

export function Contact() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] py-24">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#1e4a3f] mb-4 block">
            Contact & Support
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-[#18211f] mb-6">Get in Touch</h1>
          <p className="text-[#4a534e] text-lg leading-relaxed">
            Have questions regarding an active evaluation, file format requirements, or your registration status? Contact our corporate departments directly below.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* General Inquiries */}
          <div className="bg-white border border-[#ececec] rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <Mail className="size-8 text-[#1e4a3f] mb-6" />
            <h3 className="text-lg font-semibold text-[#18211f] mb-2">General Acquisition</h3>
            <p className="text-sm text-[#6b716d] mb-4">
              For general inquiries and portfolio submissions support.
            </p>
            <a href="mailto:sales@nscaptures.com" className="text-[#1e4a3f] font-semibold hover:underline">
              sales@nscaptures.com
            </a>
          </div>

          {/* Billing Department */}
          <div className="bg-white border border-[#ececec] rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <Mail className="size-8 text-[#1e4a3f] mb-6" />
            <h3 className="text-lg font-semibold text-[#18211f] mb-2">Billing & Compliance</h3>
            <p className="text-sm text-[#6b716d] mb-4">
              For payment routing, tax forms, and vendor registration.
            </p>
            <a href="mailto:paymentdesk@nscaptures.com" className="text-[#1e4a3f] font-semibold hover:underline">
              paymentdesk@nscaptures.com
            </a>
          </div>

          {/* Onboarding WhatsApp */}
          <div className="bg-white border border-[#ececec] rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <MessageCircle className="size-8 text-[#1e4a3f] mb-6" />
            <h3 className="text-lg font-semibold text-[#18211f] mb-2">Fast-Track Onboarding</h3>
            <p className="text-sm text-[#6b716d] mb-4">
              Connect directly with an available acquisition officer.
            </p>
            <a href="https://wa.me/447345886041" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#1e4a3f] font-semibold hover:underline bg-[#dce8df]/60 px-4 py-2 rounded-lg">
              WhatsApp Support
            </a>
          </div>

          {/* Payment Desk WhatsApp */}
          <div className="bg-white border border-[#ececec] rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <MessageCircle className="size-8 text-[#1e4a3f] mb-6" />
            <h3 className="text-lg font-semibold text-[#18211f] mb-2">Payment Desk (WhatsApp)</h3>
            <p className="text-sm text-[#6b716d] mb-4">
              Direct line for payment clearances and withdrawal issues.
            </p>
            <a href="https://wa.me/447418368900" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[#1e4a3f] font-semibold hover:underline bg-[#dce8df]/60 px-4 py-2 rounded-lg">
              Message Payment Desk
            </a>
          </div>

          {/* Call Line */}
          <div className="bg-white border border-[#ececec] rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <PhoneCall className="size-8 text-[#1e4a3f] mb-6" />
            <h3 className="text-lg font-semibold text-[#18211f] mb-2">Call Line / Text</h3>
            <p className="text-sm text-[#6b716d] mb-4">
              Speak with a representative directly via phone or text.
            </p>
            <a href="tel:+447345886041" className="text-[#1e4a3f] font-semibold hover:underline font-mono">
              +44 7345 886041
            </a>
          </div>

          {/* Hours */}
          <div className="bg-white border border-[#ececec] rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <Clock className="size-8 text-[#1e4a3f] mb-6" />
            <h3 className="text-lg font-semibold text-[#18211f] mb-2">Corporate Hours</h3>
            <p className="text-sm text-[#6b716d] mb-4">
              Our support team is available during standard London business hours.
            </p>
            <p className="text-[#1e4a3f] font-semibold font-mono">
              Mon – Fri: 09:00 – 17:00 (GMT)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
