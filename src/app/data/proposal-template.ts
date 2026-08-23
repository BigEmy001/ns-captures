/**
 * A starting point for the International Contributor Invitation & Photographic
 * Acquisition Proposal, taken from the programme brief.
 *
 * It is an invitation and an overview of the programme — deliberately not the
 * document that transfers any rights. That happens later, in the contributor
 * agreement and in an individual acquisition agreement, both of which are
 * signed. The admin edits this before sending, and whatever they send is
 * stored on the proposal so a later revision never rewrites what someone
 * actually accepted.
 */

export interface ProposalRecipient {
  name: string;
  location?: string;
  occupation?: string;
}

export function defaultProposalBody(recipient: ProposalRecipient): string {
  const greeting = recipient.name ? `Dear ${recipient.name},` : "Dear Photographer,";

  return `${greeting}

NS CAPTURES is pleased to invite you to be considered for its International Contributor & Photographic Acquisition Programme.

The programme identifies, acquires, licenses, curates and promotes exceptional photographic work internationally. We seek long-term relationships with photographers whose work demonstrates originality, technical quality, artistic character, documentary value, editorial potential or commercial suitability.

Your work has been identified as potentially suitable for consideration within the NS CAPTURES contributor network.

1. DIRECT PHOTOGRAPHIC ACQUISITION

Photographs selected for direct acquisition may be offered an agreed acquisition amount. Indicative categories:

    Standard Selection                 £150
    Premium Selection                  £300
    Signature Selection                £450
    Exceptional / Collection           £650+

These figures are indicative and do not constitute a guaranteed offer. The amount for an individual photograph is stated in the relevant acquisition offer and agreement.

2. ACCEPTANCE BONUS

NS CAPTURES may provide additional bonuses for portfolios demonstrating exceptional quality, consistency, originality, technical execution, documentary value, editorial potential, commercial potential or collection suitability. Any bonus is separately communicated and recorded.

3. EXPLORATION & DISCOVERY AWARD

We may recognise photographers whose work documents rare, underrepresented, culturally significant or visually distinctive subjects, locations, communities or environments. Awards are discretionary and subject to the applicable programme terms.

4. PERFORMANCE & COLLECTION BONUSES

Selected contributors may become eligible for performance, collection and editorial bonuses, commercial success bonuses, annual contributor awards and special acquisition incentives. Specific amounts and conditions are communicated separately.

5. INTERNATIONAL PUBLICATION

Selected works may be considered for inclusion in NS CAPTURES international photographic publications, including curated hardcover collections, with photographer credit, image placement, contributor biography and collection inclusion. Publication is subject to editorial selection and is not guaranteed by becoming a contributor.

6. FEATURED CONTRIBUTOR

Exceptional photographers may be considered for Featured Contributor status: profile features, interviews, editorial spotlights, portfolio features, collection announcements and exhibition consideration.

7. INTERNATIONAL MARKETPLACE

Approved photographs may be made available through the NS CAPTURES marketplace for customer licensing under the applicable marketplace licence terms. Contributor compensation is determined under the applicable contributor and marketplace terms.

8. OWNERSHIP & RIGHTS

Participation in the contributor programme does not, by itself, transfer copyright in any photograph to NS CAPTURES. Copyright ownership and licensing rights are established in the applicable written agreement. Where NS CAPTURES acquires copyright itself, the transfer is expressly documented in writing and signed.

9. CONTRIBUTOR RESPONSIBILITIES

You confirm that you own or control the rights necessary to submit your photographs, that your submissions do not knowingly infringe third-party rights, that required model and property permissions have been obtained where applicable, that the information you supply is accurate, and that you disclose any conflicting exclusive licences.

10. NO GUARANTEE OF ACQUISITION

Submission or approval of a photograph does not mean NS CAPTURES will purchase it. Any direct acquisition is subject to a separate acquisition offer and agreement.

11. INVITATION

We believe exceptional photographers should receive more than exposure alone. NS CAPTURES seeks to provide opportunities for photographic work to be acquired, licensed, curated, published, recognised and exhibited.

We look forward to reviewing your work.

NS CAPTURES
International Photography Acquisition & Curation Programme
London, United Kingdom`;
}
