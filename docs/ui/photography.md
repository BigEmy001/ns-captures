# Photography site UI guide

Covers the main NS CAPTURES site: home, search, photo and photographer pages, collections, pricing/about/contact, auth, the account area and the admin console. The look is **editorial and quiet**: white and warm off-white grounds, deep green brand colour, serif headings, small mono labels, pill buttons, hairline borders and very soft shadows.

For NFT pages (`/editions/*`) use [editions.md](editions.md) instead.

## Foundations

### Colour

Colours are used as Tailwind arbitrary values (`bg-[#1e4a3f]`). Stick to this palette — these are the most-used values across the site.

| Role                | Value                           | Typical use                                              |
| ------------------- | ------------------------------- | -------------------------------------------------------- |
| Brand / primary     | `#1e4a3f`                       | Solid buttons, links, active states, focus rings, icons  |
| Primary hover       | `#123b31`                       | Hover on solid buttons                                   |
| Text                | `#18211f`                       | Headings, body text, values                              |
| Secondary text      | `#4a534e`, `#59645f`, `#6b716d` | Descriptions, meta lines                                 |
| Label text          | `#758078`                       | Mono uppercase labels, stat labels                       |
| Table header text   | `#8a8f89`                       | `<thead>` labels                                         |
| Border              | `#ececec`                       | Cards, inputs, dividers (`border-[#ececec]/80` on cards) |
| Page ground         | `#FAF9F5`                       | Account/admin backgrounds, row hover                     |
| Table header ground | `#f7f7f7`                       | `<thead>` background                                     |
| Green tint          | `#dce8df` (text `#285746`)      | Chips, success badges                                    |
| Destructive         | `#d4183d` (tint `#fcf1f3`)      | Errors, count badges, destructive actions                |
| Muted tint          | `#ece9df` (text `#6d746e`)      | Neutral badges                                           |

The same brand values exist as shadcn tokens in `src/styles/theme.css` (`--primary`, `--foreground`, `--destructive`, `--border`…), which the `src/app/components/ui/` primitives use.

### Type

- **Body:** DM Sans, applied by `RootLayout` (`font-['DM_Sans']`).
- **Headings and big numbers:** `font-serif` (Tailwind's default serif stack — Playfair Display is loaded in `fonts.css` but not wired to a utility, so don't rely on it without adding a theme font token).
- **Labels, eyebrows, badges, table headers:** `font-mono`, uppercase, small and letter-spaced.

Common scale (measured from existing pages):

| Element              | Classes                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| Page title           | `font-serif text-3xl sm:text-4xl tracking-tight text-[#18211f]`              |
| Section / card title | `font-serif text-2xl` or `font-serif text-lg`                                |
| Stat value           | `font-serif text-3xl font-medium text-[#18211f]` (`text-2xl` on small cards) |
| Eyebrow              | `<Eyebrow>` → `font-mono text-[10px] tracking-[0.18em] text-[#49685d]`       |
| Mono label           | `font-mono text-[9px] tracking-[0.12em] text-[#758078] uppercase`            |
| Table header         | `font-mono text-[10px] tracking-[0.12em] text-[#8a8f89] uppercase`           |
| Body / meta          | `text-sm text-[#6b716d]`, `text-xs` for meta lines                           |

`theme.css` gives `button`, `label` and `input` a base font size, so they **don't inherit** from their parent — set text classes directly on them.

### Layout

- Page container: `mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12`, vertical rhythm `py-12`–`py-24`.
- Narrow reading content: `max-w-2xl` / `max-w-3xl`.
- Account and admin: `bg-[#FAF9F5]` ground, `SideNav` on the left, content column with an `Eyebrow` + serif `h1`, panels inside `mt-8`.
- Navbar and Footer render for every route except `/editions/*` and `/photo/:id` (see `RootLayout`). The Navbar has no plain "Editions" link: the `SpaceSwitch` sits right after the logo from `md` up (condensed from `lg` up: less padding and no Web3 tag; the header search hides between `lg` and `xl` to make room), in a full-width row under the header on phones, and at the top of the phone menu. It only shows when the admin has the Editions marketplace switched on (always for admins). `/photo/:id` has no Navbar, so it puts the switch in its own top bar (after "Back to library" from `md` up, a full-width row above it on phones). Any new page that hides the Navbar needs the switch too.

### Shape and depth

- Cards: `rounded-2xl border border-[#ececec]/80 bg-white p-6 ns-shadow-sm`.
- Buttons, chips, tabs, badges: `rounded-full`.
- Inputs: `rounded-xl border border-[#ececec] px-4 py-2 text-sm`, focus `focus:border-[#1e4a3f] focus:ring-2 focus:ring-[#1e4a3f]/10`.
- Shadow utilities (in `theme.css`): `ns-shadow-sm` (cards), `ns-shadow` (raised panels), `ns-shadow-lg` (heroes/modals), `ns-popover` (menus), `ns-lift` (hover lift for interactive cards).
- The shadcn `--radius` token is `0rem`, so `src/app/components/ui/*` primitives are square unless you pass a `rounded-*` class. Pages normally use explicit radii.

## Components (`src/app/components/ui.tsx`)

| Component       | Use                                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`        | Variants `solid` (primary green), `outline` (white, green fill on hover), `ghost`, `light` (on dark imagery); sizes `sm`/`md`. Has the brand's expanding-circle hover. One solid button per section. |
| `Badge`         | Tones `green` / `muted` / `red`, sizes `sm`/`md`. Mono, uppercase text. Status labels in tables and cards.                                                                                           |
| `Eyebrow`       | Small mono kicker above page and section titles.                                                                                                                                                     |
| `Stat`          | Mono label + serif value.                                                                                                                                                                            |
| `Monogram`      | Logo mark + wordmark (`light` on dark backgrounds).                                                                                                                                                  |
| `PartnerButton` | Marketing CTA with sliding green fill.                                                                                                                                                               |

Other shared pieces: `SpaceSwitch` (Photography | Editions switch used by both sides; text labels, no icons; the pill slides to the chosen side, then the page cross-fades; `tone` `light` / `dark` / `editions`, `size`, `fullWidth`, `condensed`; pass display classes through `className`), `Navbar`, `Footer`, `SideNav` (account/admin navigation with `items`, `active`, `onSelect`, optional `header`/`footer`), `PhotoCard`, `Dropdown`, `NotificationBell`, `CategoryNav`, `TopicRail`, `HeroSearch`. shadcn primitives live in `src/app/components/ui/` (dialog, sheet, tabs, select, tooltip, sonner…).

## Patterns

### Admin console panel

Model new admin tabs on Users, Moderation and Collections (and `pages/admin/EditionsPanel.tsx`, which follows them):

- **Stat row:** 4 cards, `grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4`, each a card with a mono label, a serif value and an optional `text-xs` hint.
- **Tabs:** pill buttons; the active one is solid green. Count badges are small red pills (`bg-[#d4183d] text-white`).
- **Tables:** wrapper `overflow-x-auto rounded-2xl border border-[#ececec]/80 bg-white ns-shadow-sm`; header `bg-[#f7f7f7]` with mono labels; cells `px-6 py-4`; rows `hover:bg-[#FAF9F5]`; add `whitespace-nowrap` to short value columns.
- **Moderation cards:** image, serif title, tier chip `bg-[#dce8df]`, meta line, actions right-aligned (Preview / Request changes / Approve). On mobile, actions stack with the primary action full-width.
- **Destructive or "send back" actions** ask for a note inline (textarea + confirm) rather than a blocking dialog.
- **Empty state:** dashed-border card with a `font-serif text-2xl` message.
- Side nav badges come from `pendingCounts` in `Admin.tsx`.

### Account tabs

Tabs are declared per role in `Account.tsx` (`{ id, label, icon }`) and rendered by `active`. Creator-only tabs check `canCreate`. Match `pages/account/NftEditionsTab.tsx` for a checklist + list layout.

### Motion

Restrained. `transition-all duration-200/300` for hovers, `ns-lift` for cards, framer-motion for page-level reveals. Honour reduced motion.

## Accessibility

- Visible focus (`focus-visible` rings in brand green).
- Switches use `role="switch"` + `aria-checked`; tabs use `role="tablist"`/`tab`; icon-only buttons have `aria-label`.
- Keep text contrast on `#FAF9F5` grounds at the listed text colours or darker.
- 390px wide with no horizontal page scroll; tables scroll inside their wrapper.
