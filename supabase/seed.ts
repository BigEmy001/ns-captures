// Seed script — generates SQL INSERT statements from the existing photos.ts data.
// Run: npx tsx supabase/seed.ts > supabase/seed.sql
// Then paste seed.sql into the Supabase SQL editor.

import { photographers, photos, collections, briefs, adminUsers, moderationQueue } from "../src/app/data/photos";

const esc = (s: string) => s.replace(/'/g, "''");
const arr = (a: string[]) => `ARRAY[${a.map((x) => `'${esc(x)}'`).join(",")}]`;
const jsonArr = (a: string[]) => `ARRAY[${a.map((x) => `'${esc(x)}'`).join(",")}]`;
const q = (s: string | null | undefined) => (s ? `'${esc(s)}'` : "NULL");
const n = (v: number | string | null | undefined) => (v != null ? String(v) : "NULL");
const bool = (v: boolean | undefined) => (v ? "TRUE" : "FALSE");

const lines: string[] = [];

lines.push("-- NS CAPTURES — Seed data");
lines.push("-- Generated from photos.ts");
lines.push("");

// Photographers
lines.push("-- Photographers");
for (const p of photographers) {
  lines.push(
    `INSERT INTO public.photographers (id, name, location, specialty, followers, avatar, bio, cover, verified, gear) VALUES ('${esc(p.id)}', '${esc(p.name)}', ${q(p.location)}, ${q(p.specialty)}, ${q(p.followers)}, '${esc(p.avatar)}', '${esc(p.bio || "")}', '${esc(p.cover || "")}', ${bool(p.verified)}, ${p.gear ? arr(p.gear) : "NULL"});`
  );
}
lines.push("");

// Photos (only the initialPhotos — the hand-crafted ones with real IDs)
lines.push("-- Photos (initial hand-crafted set)");
lines.push("-- The migrated Cloudinary photos and generated photos are inserted separately.");
lines.push("");

// Collections
lines.push("-- Collections");
for (const c of collections) {
  lines.push(
    `INSERT INTO public.collections (id, title, curator, count, description, cover) VALUES ('${esc(c.id)}', '${esc(c.title)}', '${esc(c.curator)}', ${c.count}, '${esc(c.description)}', ${jsonArr(c.cover)});`
  );
}
lines.push("");

// Briefs
lines.push("-- Briefs");
for (const b of briefs) {
  lines.push(
    `INSERT INTO public.briefs (id, title, location, license, budget, delivery, status, description) VALUES ('${esc(b.id)}', '${esc(b.title)}', '${esc(b.location)}', '${esc(b.license)}', ${b.budget}, '${esc(b.delivery)}', '${esc(b.status)}', '${esc(b.description)}');`
  );
}
lines.push("");

// Site settings
lines.push("-- Site settings");
lines.push(`INSERT INTO public.site_settings (id, site_name, site_url, support_email, platform_fee, default_commission, min_price, max_file_size) VALUES (1, 'NS CAPTURES', 'https://ns-captures.com', 'support@ns-captures.com', 20, 70, 100, 100);`);
lines.push("");

console.log(lines.join("\n"));
