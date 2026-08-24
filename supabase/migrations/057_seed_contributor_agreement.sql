-- ============================================================
-- 057_seed_contributor_agreement.sql
--
-- The International Contributor Agreement itself, as supplied by NS CAPTURES.
--
-- Seeded verbatim but for two removals: a stray zero-width no-break space
-- inside the company address, and a closing note addressed to the platform
-- owner rather than the contributor ("I would make this the master Contributor
-- Agreement..."), which is guidance about the document and has no place inside
-- a document someone signs.
--
-- The bracketed placeholders are left in. They are filled per contributor at
-- the moment of issue, from their profile and the agreement record, and frozen
-- into that agreement's own copy.
-- ============================================================

INSERT INTO public.agreement_templates (kind, title, version, body, is_current)
VALUES (
  'contributor',
  'International Contributor Agreement',
  '1.0',
  $doc$INTERNATIONAL CONTRIBUTOR AGREEMENT

Photographic Submission, Licensing, Acquisition & Contributor Programme

Agreement Reference: NSC-CA-[YEAR]-[NUMBER]
Version: [VERSION]
Effective Date: [DATE]

Acquiring / Platform Entity:
NS CAPTURES
Wood Green, London, N22 8HH,  United Kingdom


Contributor:
Name: [FULL LEGAL NAME]
Contributor ID: [CONTRIBUTOR ID]
Email: [EMAIL ADDRESS]
Country: [COUNTRY]



───

1. PURPOSE OF THIS AGREEMENT

This International Contributor Agreement ("Agreement") establishes the general terms under which a photographer or authorised photographic rights holder ("Contributor") may participate in the NS CAPTURES international contributor programme.

The programme is intended to provide a structured environment through which Contributors may submit photographic works for:

Marketplace licensing;

Direct photographic acquisition;

Curated collections;

Editorial publication;

International publications;

Exhibitions;

Commercial and editorial opportunities;

Commissioned projects;

Contributor recognition programmes; and

Other photographic opportunities offered by NS CAPTURES.


This Agreement establishes the general relationship between NS CAPTURES and the Contributor.

This Agreement does not, by itself, transfer copyright ownership in any Photograph to NS CAPTURES.

Any copyright assignment, exclusive licence, direct acquisition, publication right, commissioned-work arrangement or other special grant of rights must be established through the applicable transaction-specific agreement or terms.



───

2. DEFINITIONS

For purposes of this Agreement:

2.1 "NS CAPTURES"

Means the company or legal entity operating the NS CAPTURES platform, together with its authorised personnel, representatives, contractors and applicable service providers.

2.2 "Contributor"

Means the individual photographer or authorised rights holder registered under the Contributor account.

2.3 "Photograph" or "Work"

Means any photographic image, photograph, photographic series, collection or related photographic material submitted by the Contributor.

2.4 "Platform"

Means the NS CAPTURES website, contributor dashboard, marketplace, applications, digital services and associated systems.

2.5 "Marketplace"

Means the portion of the Platform through which approved Photographs may be displayed, discovered, licensed, purchased or downloaded by authorised customers.

2.6 "Customer"

Means an individual, business, organisation or other authorised user obtaining a licence or other permitted right to use a Photograph.

2.7 "Acquisition"

Means a direct purchase or other separately documented acquisition of rights in one or more Photographs by NS CAPTURES.

2.8 "Acquisition Agreement"

Means a separate agreement establishing the commercial and rights terms applicable to a particular direct acquisition.

2.9 "Publication"

Means a book, catalogue, magazine, digital publication, editorial feature, photographic collection or similar publication.

2.10 "Collection"

Means a curated group of Photographs assembled for a particular editorial, commercial, artistic, cultural or photographic purpose.



───

3. CONTRIBUTOR ACCOUNT

3.1 The Contributor may create and maintain a Contributor account through the NS CAPTURES Platform.

3.2 The Contributor must provide accurate and current information requested during registration.

3.3 The Contributor is responsible for maintaining the security of their login credentials.

3.4 The Contributor must not knowingly permit another person to access or operate their Contributor account in a manner that could misrepresent the identity of the Contributor.

3.5 The Contributor must promptly notify NS CAPTURES of:

suspected unauthorised access;

compromised credentials;

material inaccuracies in account information; or

any other security issue affecting the account.


3.6 NS CAPTURES may require additional verification where reasonably necessary for account security, rights administration, payment processing, fraud prevention or compliance with applicable law.



───

4. CONTRIBUTOR STATUS

A Contributor may have one or more account statuses determined by the Platform.

These may include:

Pending

Application or verification is incomplete.

Active

The Contributor is permitted to submit and participate in the programme.

Featured Contributor

The Contributor has been selected for enhanced editorial or promotional consideration.

Priority Contributor

The Contributor has established an acquisition or contribution history that qualifies for additional opportunities.

Suspended

Certain account functions have temporarily been restricted.

Closed

The Contributor relationship has ended or the account has been closed.

A status or badge does not constitute a guarantee of future acquisitions, income, publication or commercial success.



───

5. SUBMISSION OF PHOTOGRAPHS

5.1 Contributors may submit Photographs through the Platform.

5.2 NS CAPTURES may evaluate submitted Photographs according to factors including:

photographic quality;

originality;

technical execution;

composition;

subject matter;

documentary value;

editorial potential;

commercial potential;

rarity;

cultural significance;

collection suitability;

market demand;

rights clearance; and

Platform requirements.


5.3 NS CAPTURES may:

approve a Photograph;

decline a Photograph;

request additional information;

request corrections;

place a Photograph under review;

select only certain Photographs from a submission;

place a Photograph into a collection;

remove a Photograph from active consideration; or

request additional rights documentation.


5.4 Submission or approval does not automatically constitute a purchase.

5.5 Submission or approval does not automatically transfer copyright.

5.6 Submission does not guarantee licensing activity, customer downloads, publication or payment unless a separate applicable agreement expressly provides otherwise.



───

6. PHOTOGRAPH METADATA

The Contributor may be required to provide:

Photograph title;

Description;

Date captured;

Location;

Category;

Keywords;

Subject information;

Copyright information;

Model information;

Property information;

Release information; and

Other relevant metadata.


The Contributor represents that material information supplied about a Photograph is accurate to the best of their knowledge.

NS CAPTURES may standardise formatting, correct obvious formatting issues or request clarification.



───

7. COPYRIGHT OWNERSHIP

7.1 Unless otherwise expressly agreed in writing, copyright in a Photograph remains with the Contributor or lawful copyright owner.

7.2 Uploading a Photograph does not constitute a copyright assignment.

7.3 Displaying a Photograph on the Platform does not constitute a copyright assignment.

7.4 Approval of a Photograph does not constitute a copyright assignment.

7.5 Participation in the Contributor Programme does not constitute a general copyright assignment.

7.6 Any transfer of copyright must be expressly documented in an applicable written agreement.



───

8. PLATFORM DISPLAY LICENCE

For the limited purpose of operating the Contributor Programme, the Contributor grants NS CAPTURES a non-exclusive, worldwide, royalty-free licence during the period reasonably necessary to:

store submitted Photographs;

process Photographs;

create technical previews;

display approved Photographs through the Platform;

create thumbnails;

organise Photographs into search results;

administer the Contributor account;

conduct internal review;

facilitate licensing transactions;

create backups;

maintain records; and

perform other technical operations reasonably necessary to operate the Platform.


This limited platform-use permission does not constitute a copyright assignment.



───

9. MARKETPLACE LICENSING

9.1 Approved Photographs may be offered through the NS CAPTURES Marketplace.

9.2 A customer may obtain rights to use a Photograph through the applicable Marketplace Licence Terms.

9.3 The applicable licence may specify:

permitted use;

territory;

duration;

media;

distribution;

exclusivity or non-exclusivity;

commercial or editorial use;

permitted modifications;

restrictions; and

other applicable conditions.


9.4 A customer licence does not transfer copyright ownership unless the applicable transaction expressly provides for such transfer.

9.5 The Contributor authorises NS CAPTURES to facilitate such Marketplace licensing in accordance with the applicable Marketplace terms.



───

10. DIRECT PHOTOGRAPHIC ACQUISITION

10.1 NS CAPTURES may independently identify Photographs for direct acquisition.

10.2 A direct acquisition may involve:

a non-exclusive licence;

an exclusive licence;

a limited-term licence;

a worldwide licence;

a territorial licence;

a copyright assignment; or

another expressly agreed rights arrangement.


10.3 No direct acquisition shall be deemed completed merely because a Photograph has been:

uploaded;

reviewed;

approved;

shortlisted;

featured; or

described as eligible for acquisition.


10.4 A direct acquisition must be documented through an applicable Acquisition Agreement or other legally effective written confirmation.



───

11. ACQUISITION PRICING

NS CAPTURES may use acquisition categories or indicative rates, including categories such as:

Standard Selection

Indicative rate: £150 per Photograph

Premium Selection

Indicative rate: £300 per Photograph

Signature Selection

Indicative rate: £450 per Photograph

Exceptional / Collection Selection

Indicative rate: £650+ per Photograph

These figures are indicative only unless expressly confirmed as a binding offer in a specific Acquisition Agreement.

An individual Photograph may receive a different amount depending on:

rarity;

quality;

demand;

subject;

editorial significance;

commercial potential;

collection requirements;

rights granted; and

other relevant factors.




───

12. ACCEPTANCE AND PORTFOLIO BONUSES

NS CAPTURES may offer a Contributor a separate Portfolio Acceptance Bonus or similar incentive.

Eligibility may consider:

portfolio quality;

consistency;

originality;

technical quality;

documentary value;

editorial potential;

collection suitability; and

other programme criteria.


Any bonus amount and payment conditions must be confirmed in writing or through the Platform before becoming payable.



───

13. EXPLORATION & DISCOVERY AWARDS

NS CAPTURES may operate an Exploration & Discovery programme recognising Photographs that document:

underrepresented locations;

uncommon subjects;

culturally significant environments;

rare events;

unusual perspectives;

difficult-to-access environments; or

other distinctive photographic subjects.


An award may include monetary compensation, publication, recognition, collection placement or other benefits.

Such awards are discretionary unless expressly confirmed as contractual payments.



───

14. PERFORMANCE AND COLLECTION BONUSES

NS CAPTURES may offer:

performance bonuses;

collection bonuses;

editorial bonuses;

commercial success bonuses;

annual contributor awards;

special acquisition incentives; and

other contributor benefits.


Where an incentive is offered, NS CAPTURES should communicate the applicable eligibility requirements and calculation method.



───

15. PUBLICATION AND INTERNATIONAL COLLECTIONS

Selected Photographs may be considered for inclusion in:

hardcover photography books;

international photography collections;

catalogues;

digital publications;

editorial features;

photographic archives;

exhibitions; and

other curated projects.


Selection is not guaranteed merely because the Contributor has been accepted into the Contributor Programme.

Where additional rights are required, those rights should be documented through a separate Publication & Collection Agreement or other appropriate written terms.



───

16. FEATURED CONTRIBUTOR PROGRAMME

NS CAPTURES may designate certain Contributors as Featured Contributors.

Possible benefits include:

profile features;

editorial interviews;

collection features;

contributor spotlights;

social-media features;

exhibition consideration;

publication consideration;

catalogue inclusion; and

other promotional opportunities.


Featured status is not permanent and may be reviewed periodically.



───

17. INTERNATIONAL EXHIBITION CONSIDERATION

Selected Photographs may be considered for:

exhibitions;

photographic displays;

collector presentations;

cultural events;

curated installations; and

other authorised exhibitions.


Where an exhibition requires rights beyond those already granted, the applicable rights shall be documented separately.



───

18. CONTRIBUTOR OPPORTUNITIES

NS CAPTURES may make opportunities available to Contributors, including:

photographic assignments;

editorial projects;

documentary projects;

commissioned photography;

collection projects;

special acquisitions;

publishing opportunities;

exhibitions; and

other photographic projects.


An opportunity announcement is not itself a guaranteed contract unless the Contributor and NS CAPTURES subsequently agree to the applicable terms.



───

19. COMMISSIONED PROJECTS

Where NS CAPTURES commissions the Contributor to create new photographic work, the parties should enter into a separate Commission Agreement.

The Commission Agreement should establish:

project description;

deliverables;

deadlines;

compensation;

expenses;

acceptance criteria;

copyright;

licensing rights;

publication rights;

exclusivity, if any;

revisions;

cancellation;

and other project-specific conditions.




───

20. CONTRIBUTOR WARRANTIES

The Contributor represents and warrants that, to the best of their knowledge:

1. They are the creator or authorised rights holder of submitted Photographs.


2. They have authority to grant the rights being offered.


3. Submitted Photographs do not knowingly infringe third-party copyright.


4. They have disclosed known conflicting exclusive rights.


5. They have not knowingly provided materially false information.


6. They have obtained required permissions where applicable.


7. They will not knowingly submit photographs subject to conflicting contractual restrictions without disclosing those restrictions.





───

21. MODEL AND PROPERTY RELEASES

Where a Photograph contains identifiable persons, private property or other circumstances requiring permissions for a particular commercial use, the Contributor should disclose relevant restrictions and provide documentation where requested.

NS CAPTURES may classify a Photograph as:

Commercially Cleared

Editorial Use

Restricted Use

or another applicable rights category.

The classification should reflect the rights information actually available to NS CAPTURES.



───

22. TRADEMARKS AND THIRD-PARTY MATERIAL

The Contributor must disclose known third-party intellectual property or other rights that may materially affect intended use of a Photograph.

NS CAPTURES may restrict a Photograph to editorial or other appropriate uses where necessary.



───

23. PAYMENT AND CONTRIBUTOR EARNINGS

Payments shall be determined according to the applicable transaction.

The Contributor dashboard may display:

gross licence revenue;

contributor share;

platform deductions;

pending earnings;

available earnings;

acquisition payments;

bonuses;

adjustments;

payout history; and

other financial information.


An estimated amount displayed by the Platform is not necessarily a final payment obligation until the underlying transaction has been confirmed.



───

24. PAYOUTS

Contributor payouts shall be processed according to the payment method and payout schedule applicable to the Contributor account.

NS CAPTURES may require:

account verification;

payment information;

tax information where legally required;

identity verification where reasonably necessary; or

other information required for lawful payment processing.


NS CAPTURES may delay or review a payout where reasonably necessary because of:

payment errors;

chargebacks;

suspected fraud;

unresolved ownership disputes;

legal requirements;

security concerns; or

other legitimate payment-processing issues.


NS CAPTURES shall not represent a payout as completed until it has actually been processed through the applicable payment system.



───

25. TAXES

The Contributor is responsible for determining and complying with tax obligations applicable to income received through NS CAPTURES, except for taxes that NS CAPTURES is legally required to withhold or collect.

NS CAPTURES may request tax information where required by applicable law.



───

26. CONTRIBUTOR ANALYTICS

The Contributor dashboard may provide information such as:

Photograph views;

downloads;

licences;

revenue;

collection appearances;

publication selections;

portfolio performance;

customer engagement; and

other activity.


Analytics may be delayed, estimated or adjusted where necessary to correct technical or accounting errors.



───

27. NOTIFICATIONS

NS CAPTURES may provide notifications concerning:

Photograph approval;

Photograph rejection;

licence activity;

downloads;

acquisitions;

collection selection;

publication selection;

opportunities;

bonuses;

payouts;

account security;

agreements;

support tickets; and

other Contributor account activity.


Notifications should not be interpreted as payment guarantees unless the underlying transaction has been confirmed.



───

28. CONTRIBUTOR SUPPORT

The Platform may provide support categories including:

Account Support;

Submission Support;

Licensing Support;

Acquisition Support;

Payment Support;

Agreement Support;

Copyright Support; and

Technical Support.


NS CAPTURES may maintain records of support requests for operational and dispute-resolution purposes.



───

29. CONTENT REMOVAL

NS CAPTURES may remove or restrict a Photograph where reasonably necessary because of:

copyright concerns;

rights disputes;

inaccurate information;

fraud;

security issues;

legal requirements;

customer complaints;

technical problems;

violation of Platform rules; or

other legitimate operational reasons.


Where reasonably practicable, NS CAPTURES should notify the Contributor and provide an opportunity to provide relevant information.



───

30. ACCOUNT SUSPENSION

NS CAPTURES may temporarily suspend account functions where reasonably necessary to:

investigate suspected fraud;

investigate rights disputes;

protect Platform security;

comply with law;

investigate serious breaches of this Agreement; or

protect customers, Contributors or the Platform.


Suspension should not automatically extinguish valid rights already granted under separate agreements.



───

31. TERMINATION

Either party may terminate the general Contributor relationship by written notice, subject to obligations arising under existing transactions and applicable law.

Termination of the Contributor Agreement does not automatically cancel:

completed licences;

completed acquisitions;

existing publication rights;

outstanding contractual obligations; or

other rights that have already validly arisen.




───

32. EFFECT OF TERMINATION

Following termination, NS CAPTURES may:

close the Contributor account;

remove eligible unpublished Photographs;

stop accepting new submissions;

retain records required for legal or accounting purposes; and

continue administering existing transactions.


Photographs already licensed to customers shall remain subject to the applicable customer licence unless otherwise provided by the relevant agreement or applicable law.



───

33. CONFIDENTIALITY

Each party shall take reasonable measures to protect confidential, non-public information received from the other party.

Confidentiality obligations do not apply to information that:

is publicly available;

was already lawfully known;

is independently developed;

is lawfully obtained from another source; or

must be disclosed by law or lawful authority.




───

34. DATA PROTECTION

NS CAPTURES shall process Contributor personal information in accordance with applicable data-protection law and its applicable Privacy Policy.

Contributor information may include:

identity information;

contact information;

account information;

payment information;

tax information;

submitted content;

transaction history; and

Platform activity.


The Contributor should review the applicable Privacy Policy for further information.



───

35. ELECTRONIC RECORDS

The Contributor agrees that NS CAPTURES may maintain electronic records of:

account creation;

Agreement acceptance;

Photograph submissions;

approvals;

licences;

acquisitions;

payments;

payouts;

communications;

support requests; and

other relevant Platform activity.


Such records may be used for account administration, accounting, customer service and dispute resolution, subject to applicable law.



───

36. ELECTRONIC SIGNATURE AND ACCEPTANCE

The parties may accept this Agreement electronically where legally permitted.

Electronic acceptance may include:

electronic signature;

checkbox acceptance;

authenticated account acceptance;

signing through an electronic-signature service; or

another legally effective electronic method.


The Platform should retain the accepted version of the Agreement and reasonable evidence of acceptance.



───

37. AGREEMENT VERSION CONTROL

NS CAPTURES may update its general Contributor Agreement from time to time.

Where a material amendment requires renewed acceptance, the Contributor should be presented with the revised Agreement.

NS CAPTURES should maintain historical versions so that the terms applicable to earlier transactions can be identified.

A later version should not silently replace the contractual terms governing a completed transaction.



───

38. NON-EXCLUSIVITY

Unless a separate written agreement expressly provides otherwise, this Agreement is non-exclusive.

The Contributor may work with other photography companies, marketplaces, publications, clients and organisations.

Where NS CAPTURES requires exclusivity for a particular Photograph, project or collection, that exclusivity must be expressly stated in the applicable agreement.



───

39. NO GUARANTEE OF INCOME

Participation in the Contributor Programme does not guarantee:

a specific number of sales;

downloads;

licensing revenue;

acquisitions;

bonuses;

publication;

exhibition;

commissions;

international exposure; or

any minimum income.


Any specific payment or opportunity becomes binding only according to its applicable confirmed terms.



───

40. INDEPENDENT CONTRACTOR RELATIONSHIP

Unless otherwise expressly agreed, the Contributor participates as an independent contributor and not as an employee, partner or agent of NS CAPTURES.

Nothing in this Agreement creates an employment relationship, partnership, joint venture or general agency relationship.



───

41. LIMITATION OF AUTHORITY

Neither party may represent that it has authority to bind the other party except where such authority has been expressly granted.

The Contributor may not represent themselves as an employee or authorised representative of NS CAPTURES solely because they participate in the Contributor Programme.



───

42. PLATFORM CHANGES

NS CAPTURES may modify, improve or discontinue Platform features where reasonably necessary.

Changes may include:

dashboard design;

submission functionality;

search systems;

notification systems;

analytics;

payment interfaces;

collection systems; and

other technical features.


Material contractual rights should not be altered retroactively without an appropriate legal basis.



───

43. FORCE MAJEURE

Neither party shall be responsible for failure or delay caused by circumstances beyond its reasonable control, including:

natural disasters;

major infrastructure failures;

widespread internet outages;

war;

civil emergencies;

government restrictions;

major payment-network failures; or

other comparable circumstances.


This provision does not remove obligations that cannot legally be excluded.



───

44. DISPUTE RESOLUTION

The parties should first attempt to resolve disputes through good-faith communication.

A Contributor may contact NS CAPTURES through the applicable support or contractual contact channel.

Where a dispute cannot be resolved informally, the parties may pursue the remedies available under the applicable governing law and jurisdiction.



───

45. GOVERNING LAW

Governing Law and Jurisdiction
This Agreement and any dispute or claim arising out of or in connection with it shall be governed by and construed in accordance with the laws of England and Wales. The courts of England and Wales shall have jurisdiction to settle any dispute or claim arising out of or in connection with this Agreement.





───

46. SEVERABILITY

If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue to operate to the extent permitted by applicable law.



───

47. WAIVER

A failure or delay by either party to enforce a provision does not automatically constitute a waiver of that provision or the right to enforce it later.



───

48. ENTIRE AGREEMENT

This Agreement constitutes the general Contributor relationship between the parties concerning participation in the NS CAPTURES Contributor Programme.

Specific transactions may be governed by separate documents, including:

Marketplace Licence Terms;

Individual Acquisition Agreement;

Publication & Collection Agreement;

Commission Agreement;

Exhibition Agreement; or

another applicable written agreement.


Where a separate agreement specifically addresses a transaction, that agreement governs that transaction to the extent of any inconsistency.



───

49. ORDER OF PRECEDENCE

Unless otherwise stated in writing, the following order applies to a particular transaction:

1. The specific transaction agreement;


2. The applicable licence terms;


3. This Contributor Agreement;


4. General Platform terms.



This is intended to ensure that a specific acquisition or publication agreement can establish rights that are different from the general Contributor relationship.



───

50. NOTICES

Formal notices may be delivered through:

the Contributor's registered email address;

the Contributor dashboard;

an electronic-signature system;

another agreed electronic method; or

another legally appropriate method.


Notices relating to material contractual matters should be retained as part of the relevant transaction record.



───

51. CONTRIBUTOR ACCEPTANCE

By signing or electronically accepting this Agreement, the Contributor confirms that:

1. They have read the Agreement;


2. They understand its general terms;


3. They have had an opportunity to seek independent advice where appropriate;


4. The information supplied during registration is accurate to the best of their knowledge;


5. They understand that submission does not automatically mean acquisition;


6. They understand that copyright is not transferred merely by joining the Contributor Programme; and


7. They agree to comply with the applicable NS CAPTURES Platform and Contributor requirements.





───

SIGNATURES

CONTRIBUTOR

Full Legal Name:



───

Contributor ID:



───

Email Address:



───

Signature:



───

Date:



───

NS CAPTURES


Authorised Representative:


JOHN MILLER

Position:

HEAD OF LEGAL AFFAIRS


Signature:



───

Date:



───




───

DOCUMENT CONTROL

Agreement Reference: NSC-CA-[YEAR]-[NUMBER]
Version: [VERSION]
Effective Date: [DATE]
Contributor: [FULL LEGAL NAME]
Contributor ID: [ID]

Status: Accepted / Signed / Electronically Accepted
$doc$,
  true
)
ON CONFLICT (kind, version) DO UPDATE
  SET body = EXCLUDED.body,
      title = EXCLUDED.title;

NOTIFY pgrst, 'reload schema';
