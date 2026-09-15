# NS CAPTURES — agent guide

Read this before changing anything. For UI work, also read the guide for the side you're touching:

- **Photography site** (home, search, photo pages, account, admin): [docs/ui/photography.md](docs/ui/photography.md)
- **NFT Editions** (everything under `/editions`): [docs/ui/editions.md](docs/ui/editions.md)

The two sides share a codebase but not a look. Don't mix their tokens or components.

## Stack

- React 18 + Vite, TypeScript 5.9, react-router v7 (`createBrowserRouter` in `src/app/routes.tsx`, pages lazy-loaded)
- Tailwind CSS v4 (CSS-first config in `src/styles/`; no `tailwind.config.js`). CSS variables are used directly: `bg-(--ed-bg)`
- framer-motion 12 (import from `"framer-motion"`), lucide-react icons, sonner toasts
- Supabase auth and data. Roles: `Buyer | Photographer | Contributor | Enterprise | Admin` (`src/app/data/roles.ts`)
- NFT Editions data is a localStorage mock (`src/app/data/editions.ts`); changes stay in the current browser
- Vitest + Testing Library (jsdom)

## Commands

```bash
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run lint       # eslint . (or: npx eslint <files> for just what you touched)
npm test           # vitest run
npm run build
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and build. The pre-commit hook runs `scripts/no-secrets.mjs`, lint-staged (eslint --fix + prettier) and typecheck, so commits may reformat files.

## Map

```
src/app/routes.tsx               routes (lazy pages)
src/app/pages/                   photography pages + Editions*.tsx pages
src/app/pages/account|admin/     account tabs, admin console panels
src/app/pages/studio/            Editions studio sections (Web3 side of an account)
src/app/components/ui.tsx        photography primitives (Button, Badge, Eyebrow, Stat…)
src/app/components/ui/           shadcn primitives (radius token is 0 — see photography guide)
src/app/components/editions/     NFT design system: shell, tokens, shared components, hooks
src/app/data/                    data layer (editions.ts, nftGuides.ts, roles.ts, db…)
src/styles/                      fonts.css, tailwind.css, theme.css (photography tokens)
src/app/components/editions/editions.css   NFT tokens (dark/light)
```

## How to work on UI

1. **Find the pattern first.** Look at a sibling screen on the same side and copy its structure, class strings and components. Reuse shared components before writing new ones; if you need a new shared piece, add it to the shared file, not the page.
2. **Build every state:** loading, empty, error, disabled, hover, focus-visible, selected. Empty states get a message and a next action.
3. **Make it work everywhere:** 390px wide with no horizontal scroll, dark and light (NFT side), keyboard only, `prefers-reduced-motion`.
4. **Keep data honest.** If the data doesn't exist (e.g. there are no stored NFT offers), don't fake a control for it — adapt to real data and say so in your summary.
5. **Verify in a real browser** before calling it done (see below).

## Verification checklist

- `npm run typecheck` and `npx eslint <touched files>` are clean (no new warnings).
- Run related tests (`npx vitest run <path>`); add tests for data-layer logic.
- Drive the page with Playwright (e.g. `npx playwright` in a scratch script outside the repo): screenshot at 1440×900 and 390×844, both themes on the NFT side; assert `document.documentElement.scrollWidth` equals the viewport width; collect `console` errors (ignore the third-party tawk.to widget and the Supabase `site_settings` CORS noise on localhost).
- Click through the actual flows (filters, sort, modals, back navigation), not just the first render.
- Signed-in screens (account, admin) can be tested on the real route without touching the repo: in Playwright, `context.route("**/src/app/context/AuthContext.tsx**", …)` and fulfil it with a small JS module exporting `useAuth()` (a fake user plus no-op functions) and a pass-through `AuthProvider`. Intercept `https://api.cloudinary.com/**` the same way to fake image uploads (return `{ secure_url }` with `Access-Control-Allow-Origin: *`). Playwright contexts start with empty localStorage, so seed NFT data after the first page load. The older alternative is a temporary harness page (`preview-*.html` + `src/__preview__/`) — **delete it afterwards**.
- Look at your screenshots. Mismatched font sizes, misplaced absolutely-positioned elements and low-contrast controls have all been caught this way.

## Gotchas (all hit in practice)

- **Buttons and labels don't inherit font size.** `theme.css` sets `font-size` on `button`, `label`, `input` in the base layer. Put text classes on the element itself (e.g. `font-mono text-xs` on a sort button inside a small table header).
- **`relative` beats `absolute` in Tailwind's output order.** Never ship both on one element; let callers pass positioning via `className` instead of baking `relative` into a reusable component. The same goes for display utilities: a component that always adds `inline-flex` can't be hidden with `hidden md:inline-flex`.
- **`overflow: hidden` breaks `position: sticky`** for descendants. Clip decorative layers in their own absolutely-positioned box, or use `overflow-clip`.
- **`position: fixed` inside a transformed ancestor** (framer-motion `whileInView`/`initial` y offsets) is positioned relative to that ancestor. Render modals as siblings of animated sections, not inside them.
- **StrictMode runs effects twice in dev.** Don't consume one-shot flags (sessionStorage, query params) in the effect body; clear them when the work actually happens.
- **`RootLayout` scrolls to top on every pathname change.** To land somewhere else after navigation, scroll after it (e.g. a short timeout) — see `Nft101Section` return-to-section logic.
- **Stretched row links** (`after:absolute after:inset-0` on a link inside a `relative` `<tr>`) cover the row; controls inside the row need `relative z-10`. In Playwright, click by coordinates (`page.mouse.click`) because the overlay intercepts element clicks.
- **SVG strokes from CSS variables** need `style={{ stroke: "var(--token)" }}`; presentation attributes don't resolve `var()`.
- **Generic `onChange` props:** type as `(id: NoInfer<T>) => void` so passing a state setter doesn't widen `T` to `string`.
- **react-refresh lint warning:** component files should only export components. Put helpers/constants in `.ts` files (e.g. `nftGuides.ts`, `collectionStats.ts`).
- **`*.png` is gitignored** repo-wide (photographs live in Cloudinary). UI illustrations that ship with the app need an explicit exception in `.gitignore` (see `src/assets/nft-101/`).
- **Figma MCP asset URLs expire after 7 days.** Download assets into `src/assets/…` before committing; never hand-draw icons.
- **File names that differ only in case collide on macOS.** `SpaceSwitch.tsx` next to `spaceSwitch.ts` made `import "./SpaceSwitch"` resolve to the helper. Give helper files a distinct name (e.g. `spaceSwitchRoutes.ts`). After renaming, Vite can keep the stale resolution: `touch` the importing files (or restart the dev server) and confirm the served module's import path.

## Git

- Work on a feature branch; commit only when asked.
- Conventional commits scoped by area, e.g. `feat(editions): …`, `fix(admin): …`. Explain what changed and why in the body.
- Stage files by path; don't sweep in scratch files, screenshots or harness pages.

## Writing copy

Plain, short, sentence case. Say what the user can do ("Show 2 collections", "Clear floor price"), not system internals. Be accurate about platform rules — check the data layer before describing a flow (deposit thresholds, review steps, fees).
