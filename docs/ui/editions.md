# NFT Editions UI guide

Covers every screen under `/editions`. The look follows the Figma "photo details" / marketplace designs (OpenSea-style): **dark by default with a full light theme**, dense data, system sans with mono labels, rounded surfaces, hairline borders, blue primary actions and restrained motion.

For the main photography site use [photography.md](photography.md) instead. Never use photography colours (`#1e4a3f`, serif headings) on editions screens.

## Routes and pages

| Route                      | Page                                | Notes                                                                                                                                             |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/editions`                | `pages/Editions.tsx`                | Featured carousel, Trending collections, catalogue (Items/Activity), NFT 101 carousel. Hidden from non-admins when marketplace visibility is off. |
| `/editions/collection`     | `pages/EditionCollectionsIndex.tsx` | Collections index: filter sidebar, Trending/Top/Watchlist, timeframe, table/grid.                                                                 |
| `/editions/collection/:id` | `pages/EditionCollection.tsx`       | Collection page: banner, stats, items grid with filters, analytics, activity.                                                                     |
| `/editions/:id`            | `pages/EditionDetail.tsx`           | Edition detail: artwork viewer, buy, traits, certificate. Unpublished editions visible only to creator/admin.                                     |
| `/editions/learn/:slug`    | `pages/EditionsLearnArticle.tsx`    | NFT 101 guide pages (content in `data/nftGuides.ts`).                                                                                             |
| `/editions/studio`         | `pages/EditionsStudio.tsx`          | The Web3 home for a signed-in account: onboarding until Web3 is switched on, then the studio. `?section=` picks the tab.                          |
| `/editions/creator/:id`    | `pages/EditionsCreator.tsx`         | Public creator/collector page (photographer slug/id or user id): Created, Collections, Collected.                                                 |

Related: `pages/admin/EditionsPanel.tsx` (admin review, photography styling), `components/MintEditionModal.tsx` (mint or edit an edition; accepts any `MintArtwork`, an `artworkSource` and an optional `edition` to edit), `components/CertificateOfAuthenticityModal.tsx`.

### Web3 on one account: onboarding and the studio

There is no separate Web3 sign-up. A signed-in NS CAPTURES account **switches Web3 on** (`activateWeb3`) as a `collector` or `creator`; creator also needs `hasCreatorAccess()` (verified photographer/contributor). Collectors can upgrade to creators later; the original activation date is kept.

- **Onboarding** (`components/editions/Web3Onboarding.tsx`): `Web3OnboardingFlow` with `role="choose"` (studio page: choose → profile → wallet & terms), `"creator"` (profile → wallet & terms; blocked message if not verified) or `"collector"` (light version: wallet & terms only). `Web3ActivationModal` wraps it in `EditionsModal`.
- **Gate actions** with `useWeb3Activation()` → `{ isActivated, requireWeb3(role, action), activationModal }`: `requireWeb3` runs the action immediately when ready, otherwise opens onboarding and runs it after. Render `activationModal` once per page. Used before buying (marketplace, collection page, edition page) and before minting from a photo page.
- **Studio** (`pages/EditionsStudio.tsx`, sections in `pages/studio/`): creators get Overview, Create, Editions, Collections, Collected, Profile; collectors get Collected and Profile, plus an upgrade card when they have creator access. Data comes from `loadStudioData(user)` in `pages/studio/studioData.ts`. Shared studio pieces: `components/editions/StudioUi.tsx` (`ImageField`, `UploadButton`, `ReviewChip`, `CreatorAvatar`, `StudioSectionHeader`) and `components/editions/studioFormat.ts` (surface card, field, textarea, small/medium button classes, review chip tones). Image uploads go through `uploadImageFile()` in `src/lib/imageUpload.ts` (Cloudinary, 15 MB image limit).
- **Account side**: `pages/account/NftEditionsTab.tsx` is only a photography-styled summary card that links to the studio and lists what stays in the account (vault, uploads, payouts, verification). Don't rebuild NFT controls there.
- **Navigation**: both headers carry the **Photography | Editions switch** (`components/SpaceSwitch.tsx`, routing rules in `components/spaceSwitchRoutes.ts`). It sits right after the logo (Editions header from `sm`, photography header from `md`) and as a full-width row directly under the header on phones. The photography phone menu and the photo page's top bar (`/photo/:id` has no Navbar) carry it too. Switching returns people to the last page they visited on the other side, maps `/account` ↔ `/editions/studio` once Web3 is on, and maps a published platform photo edition to its photo page; `RootLayout` cross-fades when the side changes. The Editions header account button opens a menu (Your studio, Your public page when Web3 is on, Photography account, Sign out). The rail's "Create an edition" goes to `/editions/studio?section=create`, "Your studio" to `/editions/studio`, "Account settings" to `/account`. Old `/editions?mint=1` links redirect to the studio.

## Theme tokens (`components/editions/editions.css`)

Always style with tokens so both themes work: `bg-(--ed-surface)`, `text-(--ed-muted)`, `border-(--ed-border)`. Dark values live on `:root`; `[data-ed-theme="light"]` overrides them. `EditionsShell` sets `data-ed-theme` from `useEditionsTheme()`.

| Token                                              | Use                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--ed-bg`                                          | Page ground                                                                                |
| `--ed-surface`                                     | Cards, tables, header, inputs on grounds                                                   |
| `--ed-raised`                                      | Hover fills, image placeholders, secondary hover                                           |
| `--ed-border` / `--ed-border-strong`               | Hairlines / stronger outlines, switch tracks                                               |
| `--ed-text` / `--ed-text-soft` / `--ed-muted`      | Primary text / long-form body / labels and meta                                            |
| `--ed-hover` / `--ed-selected`                     | Row hover / selected pill background                                                       |
| `--ed-divider`                                     | Subtle separators inside surfaces                                                          |
| `--ed-image-outline`                               | 1px outline on images (`outline outline-1 -outline-offset-1 outline-(--ed-image-outline)`) |
| `--ed-primary` / `--ed-primary-hover`              | Primary buttons, focus borders, checkboxes                                                 |
| `--ed-positive` / `--ed-negative` / `--ed-warning` | Gains / losses and errors / starred, cautions                                              |
| `--ed-shadow` / `--ed-shadow-lg`                   | Menus / modals                                                                             |
| `--ed-ambient-opacity`, `--ed-glow-opacity`        | Artwork ambient backdrop, article header glow                                              |
| `--ed-tone-*-bg/fg`                                | Trait rarity chips                                                                         |

Hard-coded colours are only acceptable on imagery overlays (e.g. white carousel dots over photos, `text-[#fff]` on primary buttons).

## Typography

- `EditionsShell` uses `font-sans` (system stack). Labels, prices, counts and table headers use `font-mono`.
- Page title: `text-[28px] leading-9 sm:text-[40px] sm:leading-[48px] font-medium` (hero) or `text-[32px] sm:text-[44px]` (articles).
- Section heading: `text-xl font-medium tracking-[-0.3px] text-(--ed-text)`.
- Body: `text-sm` (UI) or `text-[15px] leading-7 text-(--ed-text-soft)` (long-form).
- Mono label: `monoLabelClass` → `font-mono text-xs uppercase leading-[15px] text-(--ed-muted)`.
- Prices and numbers: `font-mono`; right-align numeric table columns.

## Shared building blocks

### Class tokens (`components/editions/editionsFormat.ts`)

`primaryButtonClass`, `secondaryButtonClass` (add size, e.g. `h-10 px-5 text-sm`), `iconButtonClass`, `inputClass`, `selectClass` (pair with a rotated `chevronLeftIcon` `MaskIcon`), `tableHeadClass`, `monoLabelClass`. Motion: `fadeUpVariants` (one-shot entrance, pass a delay via `custom`) and `sectionReveal` (scroll-triggered section reveal; spread onto `motion.section`). Formatters: `formatEth`, `formatGbp`, `formatDate`, `formatPercent`, `shortHex`, `initials`, `tierLabel`, `collectionHrefFor` (collection page, or the collections index for editions listed on their own), `creatorHref(key)` / `creatorHrefFor(edition)` (public creator page).

### Components (`components/editions/editionsUi.tsx`)

| Component                                                  | Props / use                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EditionsShell` (`EditionsShell.tsx`)                      | Page frame: slim rail, sticky 64px header with search, theme toggle, account. Props: `activeRail` (`discover` \| `collections` \| `activity` \| `studio` \| `certificates`), `walletLabel`, `headerActions`, `banner`, `onActivity`, `onCertificates`, `collectionHref` (defaults to the collections index — leave it). |
| `EditionsModal`                                            | `title`, `eyebrow?`, `onClose`, `footer?`, `size?: "md" \| "lg"`. Bottom sheet on mobile, centred dialog on desktop; locks body scroll and closes on Escape.                                                                                                                                                            |
| `EmptyState`                                               | `title`, `description?`, `action?`. Always give a next step.                                                                                                                                                                                                                                                            |
| `TabBar`                                                   | Underlined tabs with counts and optional trailing controls.                                                                                                                                                                                                                                                             |
| `SegmentedControl`                                         | Pill radio group (`options`, `value`, `onChange`, `label`, `fullWidth?`) with animated indicator.                                                                                                                                                                                                                       |
| `FilterGroup`                                              | Collapsible sidebar section (`title`, `open`, `onToggle`).                                                                                                                                                                                                                                                              |
| `Sparkline`                                                | Trend line coloured by direction (positive/negative tokens).                                                                                                                                                                                                                                                            |
| `Stat`                                                     | Mono label + mono value; use inside `<dl>`.                                                                                                                                                                                                                                                                             |
| `Chip`, `VerifiedBadge`                                    | Small uppercase chip; verified tick.                                                                                                                                                                                                                                                                                    |
| `DetailSection`                                            | Collapsible detail panel with icon (edition detail page).                                                                                                                                                                                                                                                               |
| `EditionCard`                                              | `edition`, `currency?`, `onBuy?`, `onInspectCertificate?`.                                                                                                                                                                                                                                                              |
| `ActivityTable`                                            | `activities`, `editions?`, `emptyDescription?`.                                                                                                                                                                                                                                                                         |
| `ArtworkPreview` / `ArtworkLightbox` (`ArtworkViewer.tsx`) | Artwork column with ambient backdrop and zoom.                                                                                                                                                                                                                                                                          |
| `Nft101Section` / `NftGuideCard` (`Nft101Section.tsx`)     | NFT 101 carousel and guide card.                                                                                                                                                                                                                                                                                        |
| `MaskIcon` (`components/MaskIcon.tsx`)                     | Renders exported single-colour SVGs as `currentColor` masks. Icons live in `src/assets/edition-detail/`.                                                                                                                                                                                                                |

Hooks: `useEditionVault()` → `{ user, wallets, balances, depositConfig, primaryEvmAddress, walletLabel, checkPurchaseGate }`; `useWeb3Activation()` → `{ isActivated, requireWeb3, activationModal }`; `useEditionsTheme()` → `{ theme, setTheme }`; `useBodyScrollLock(active)`.

Collections stats: `components/editions/collectionStats.ts` → `buildCollectionRows(editions, ownerships, timeframe)`, `TIMEFRAMES`, `TIMEFRAME_SCALE`, `COLLECTION_MOMENTUM`, `tokenStandardFor`, `formatCompactGbp`, `formatChange`.

## Data layer (`src/app/data/editions.ts`)

- **localStorage mock.** Editions, ownerships, activity, deposit config, creator collections, creator profiles and visibility are stored per browser (`getStored*` / `saveStored*`). Every creator/admin action (`mintDigitalEdition`, the review actions, `updateEditionDetails`, `setEditionSalesPaused`, `deleteEditionDraft`, collection create/update/delete, `saveEditionCreatorProfile`) dispatches `EDITIONS_CHANGED_EVENT` on `window`; `saveStored*` and `purchaseEdition` don't, so re-read storage after calling them. Screens that list editions should listen for the event and for `storage`.
- **Only show published editions publicly:** use `getPublishedEditions()` / `getEditionsByCollection()`. Review statuses: `draft → pending_review → published | rejected` (`editionReviewStatus`, `approveEdition`, `rejectEdition` needs a note, `submitEditionForReview`, `withdrawEditionFromReview`, `deleteEditionDraft`). Seed editions with no status count as published.
- **Purchases:** `purchaseEdition(id, buyer, currency)` assigns the next serial and issues a certificate; it refuses unpublished or paused editions. Use `isEditionForSale(edition)` (published, not paused, copies left) for buy buttons. Edition pages gate buying with `checkPurchaseGate()` (deposit thresholds from `getDepositConfig()`; admins can change them — never hard-code the amounts in copy).
- **Minting and editing:** `mintDigitalEdition({... collectionId?, artworkSource?, submitForReview?})` creates a draft or submits it; derive prices with `pricesFromGbp()`. `artworkSource` is `portfolio` (approved photo), `upload` or `profile` — non-photo artwork has no camera data, so UI shows a "Medium" trait instead of camera/lens/ISO. Creators edit drafts and editions with requested changes via `updateEditionDetails()` and pause/resume live editions via `setEditionSalesPaused()`.
- **Collections:** `getEditionCollections()` = curated collections + creator collections; `getEditionCollection(idOrName)`; membership via `editionBelongsToCollection()` (explicit `collectionId` first; curated collections also match `collectionName` or `photographerId`). Creator collections (`createdBy` set) come from `createEditionCollection` / `updateEditionCollection` / `deleteEditionCollection` (blocked while an edition in it is live or in review) and stay private until one of their editions is published — use `getPublicEditionCollections()` for anything public.
- **Creators:** `getEditionCreatorProfile(userId)`, `saveEditionCreatorProfile()` (also updates name/avatar on their editions and collections; any account can have one, collectors included), `resolveCreatorIdentity(user)` for the name and avatar to show, `getCreatorSalesSummary()`, `getOwnershipsByOwner()`. There is no resale marketplace yet — don't build "list for resale" UI without it.
- **Web3 activation and public pages:** `getWeb3Activation(userId)`, `isWeb3Activated(userId, role?)`, `activateWeb3(userId, role)` (stored per browser, dispatches the change event). `getCreatorPageData(key)` builds a public page from a photographer slug/id or user id — published editions, public collections and collected editions only; returns `null` when there's nothing public.
- **Visibility:** `isEditionsPublic()` / `setEditionsPublic()` + `EDITIONS_VISIBILITY_EVENT`.
- **Illustrative figures:** collection change, volume, sales and trend come from `COLLECTION_MOMENTUM`. Floor, supply and owners are real. No offers are stored — don't build offer UI without adding the data first.
- **Guides:** `data/nftGuides.ts` (`NFT_GUIDES`, `getNftGuide`, `guideReadMinutes`, `guideText` for copy that depends on admin settings).

Tests for the data layer live in `src/app/data/editions.test.ts`; add cases when you change rules.

## Layout patterns

- **Page body:** `<main className="flex flex-1 flex-col gap-10 px-4 pb-16 pt-6 sm:px-6">` inside `EditionsShell`. Sections: `motion.section {...sectionReveal} className="flex flex-col gap-4"`.
- **Filter sidebar (desktop):** sticky under the header — `sticky top-16 h-[calc(100dvh-4rem)] w-[272px] overflow-y-auto border-r`. Content = search, `FilterGroup`s with chips (`role="radiogroup"`, counts), range filters (Min "to" Max + Apply, disabled until changed, min>max warning, Clear link) and `role="switch"` toggles. On smaller screens render the same content in an `EditionsModal` with "Reset" and "Show N results".
- **Sticky toolbar:** `sticky top-16 z-20 border-b bg-(--ed-bg)/90 backdrop-blur-md`.
- **Data tables:** wrapper `@container overflow-hidden rounded-lg border border-(--ed-border) bg-(--ed-surface)`; `tableHeadClass` on `<thead>`; hide lower-priority columns with container queries (`hidden @md:table-cell`, `@xl`, `@3xl`, `@4xl`, `@5xl`) so layout adapts to the column width, not the viewport. Sortable headers are buttons with `aria-sort` on the `<th>`.
- **Whole-row links:** `<tr className="relative …">` + link with `after:absolute after:inset-0`; in-row controls get `relative z-10`.
- **Cards grid:** `grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Horizontal carousels:** `snap-x snap-mandatory overflow-x-auto` bleeding to the page edge (`-mx-4 px-4 sm:-mx-6 sm:px-6`), prev/next `iconButtonClass` buttons that disable at the ends, and cards not fully in view faded with an `IntersectionObserver`.
- **Articles:** header grid (text + 3:2 image), sticky "On this page" TOC with scroll-spy on `lg`, sections with `scroll-mt-24`, then takeaways → FAQs (`<details>`) → CTA → previous/next → related cards.
- **Decorative glow:** `.ed-article-glow` in `editions.css` — tints via `--ed-glow-a/b`, masked fade, slow transform-only drift, disabled for reduced motion.

## Motion rules

- `MotionConfig reducedMotion="user"` is set by the shell; CSS animations need their own `prefers-reduced-motion` block.
- Springs with `bounce: 0`; entrances `fadeUpVariants` or `sectionReveal`; `AnimatePresence initial={false}` for toggles that shouldn't animate on load.
- Animate `opacity`/`transform` only; name exact properties (`transition-[background-color,border-color]`), never `transition-all` on new code.
- Press feedback is built into the button tokens (`active:scale-[0.96]`).
- Ambient/looping motion must be slow (20s+) and subtle.

## Accessibility

- Radio-style chips: `role="radiogroup"` / `role="radio"` + `aria-checked`. Toggles: `role="switch"`. Ranking/segment buttons: `aria-pressed`. Collapsibles: `aria-expanded`.
- Icon-only buttons need `aria-label` (and usually `title`). Stars: "Add X to watchlist" / "Remove X from watchlist".
- Focus: `focus-visible` rings with `--ed-primary`.
- Result counts that change with filters use `aria-live="polite"`.
- Check contrast in **light** mode too (e.g. switch tracks use `--ed-border-strong` when off).

## Figma

Designs live in the "Untitled" Figma file (`mYRG7NNSDR9txGiAd1RDNo`): detail page `18:2`, collection/marketplace `18:567` (NFT 101 block `18:2106`). Use `get_design_context` on the specific node, adapt to the tokens and components above, and download assets into `src/assets/…` (URLs expire). OpenSea-specific concepts (offers, branded pages, metadata storage) should be mapped to NS CAPTURES data or omitted.
