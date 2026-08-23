import { Link } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { Card, PortalPage } from "./shared";

/** Support routes from the programme brief, so a contributor picks a subject
 *  rather than writing into a generic contact box. */
const TOPICS = [
  { name: "Account", body: "Sign-in, profile details, contributor status." },
  { name: "Uploads", body: "Submitting work, review outcomes, file problems." },
  { name: "Licensing", body: "How your photographs are licensed and by whom." },
  { name: "Acquisitions", body: "Offers, terms and acquisition agreements." },
  { name: "Payments", body: "Earnings, payout requests and payment methods." },
  { name: "Agreements", body: "Signing, copies and what a clause means in practice." },
  { name: "Copyright", body: "Ownership, releases and unauthorised use." },
];

export function SupportTab() {
  const { user } = useAuth();

  return (
    <PortalPage
      eyebrow="HELP & SUPPORT"
      title="Contributor Support"
      intro="Pick the subject closest to what you need and we will route it to the right person. Include your Contributor ID so we can find your account quickly."
      aside={
        user?.contributorId ? (
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase">
              Contributor ID
            </p>
            <p className="mt-1 font-mono text-sm text-[#18211f]">{user.contributorId}</p>
          </div>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((topic) => (
          <Card key={topic.name}>
            <h3 className="font-serif text-lg text-[#18211f]">{topic.name}</h3>
            <p className="mt-1.5 text-sm text-[#59645f]">{topic.body}</p>
            <Link
              to={`/contact?subject=${encodeURIComponent(`Contributor support — ${topic.name}`)}`}
              className="mt-4 inline-block text-xs font-semibold text-[#1e4a3f] underline underline-offset-4"
            >
              Get help with {topic.name.toLowerCase()}
            </Link>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-sm text-[#758078]">
        Ticket tracking is not available yet — these route to the contact form, and replies come by
        email.
      </p>
    </PortalPage>
  );
}
