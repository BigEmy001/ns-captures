import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Eye, FileBadge } from "lucide-react";
import { CertificateOfAuthenticityModal } from "../../components/CertificateOfAuthenticityModal";
import { getStoredEditions, type DigitalEdition, type EditionOwnership } from "../../data/editions";
import { EmptyState } from "../../components/editions/editionsUi";
import { monoLabelClass } from "../../components/editions/editionsFormat";
import { StudioSectionHeader } from "../../components/editions/StudioUi";
import {
  formatGbpWhole,
  formatShortDate,
  smallPrimaryButton,
  smallSecondaryButton,
  surfaceCardClass,
} from "../../components/editions/studioFormat";

export function StudioCollected({ owned }: { owned: EditionOwnership[] }) {
  const [certificate, setCertificate] = useState<{
    edition: DigitalEdition;
    ownership: EditionOwnership;
  } | null>(null);

  const items = useMemo(() => {
    const editions = new Map(getStoredEditions().map((e) => [e.id, e]));
    return owned.flatMap((ownership) => {
      const edition = editions.get(ownership.editionId);
      return edition ? [{ edition, ownership }] : [];
    });
  }, [owned]);

  const spent = items.reduce((sum, item) => sum + item.ownership.purchasePriceGbp, 0);

  return (
    <section aria-labelledby="studio-collected">
      <StudioSectionHeader
        id="studio-collected"
        title="Editions you own"
        description="Every edition you buy comes with a Certificate of Authenticity."
        action={
          items.length > 0 ? (
            <p className="text-sm text-(--ed-muted)">
              {items.length} edition{items.length === 1 ? "" : "s"} · {formatGbpWhole(spent)} spent
            </p>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No collected editions yet"
          description="Editions you buy appear here with their serial numbers and certificates."
          action={
            <Link to="/editions" className={smallPrimaryButton}>
              Browse editions
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ edition, ownership }) => (
            <li key={ownership.id} className={`${surfaceCardClass} flex flex-col overflow-hidden`}>
              <img
                src={edition.image}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-(--ed-text)">{edition.title}</p>
                  <p className="truncate text-sm text-(--ed-muted)">
                    by {edition.photographerName}
                    {edition.collectionName && ` · ${edition.collectionName}`}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
                  {[
                    { label: "Serial", value: ownership.serialDisplay },
                    { label: "Paid", value: formatGbpWhole(ownership.purchasePriceGbp) },
                    { label: "Acquired", value: formatShortDate(ownership.acquiredAt) },
                    { label: "Certificate", value: ownership.certificateNumber },
                  ].map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className={monoLabelClass}>{row.label}</dt>
                      <dd className="mt-1 truncate font-mono text-sm text-(--ed-text)">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCertificate({ edition, ownership })}
                    className={smallPrimaryButton}
                  >
                    <FileBadge aria-hidden className="size-3.5" />
                    Certificate
                  </button>
                  <Link to={`/editions/${edition.id}`} className={smallSecondaryButton}>
                    <Eye aria-hidden className="size-3.5" />
                    View edition
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {certificate && (
        <CertificateOfAuthenticityModal
          edition={certificate.edition}
          ownership={certificate.ownership}
          onClose={() => setCertificate(null)}
        />
      )}
    </section>
  );
}
