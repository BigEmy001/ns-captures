// Photo seed script — generates SQL for ALL photos from photos.ts
// Run: npx tsx supabase/seed-photos.ts >> supabase/seed.sql

import { photos } from "../src/app/data/photos";

const esc = (s: string) => String(s).replace(/'/g, "''");
const q = (s: string | null | undefined) => (s ? `'${esc(s)}'` : "NULL");
const n = (v: number | string | null | undefined) => (v != null ? String(v) : "NULL");
const arr = (a: string[]) => `ARRAY[${a.map((x) => `'${esc(x)}'`).join(",")}]`;

const lines: string[] = [];
lines.push("-- ============================================================");
lines.push("-- ALL PHOTOS (initial + migrated + generated)");
lines.push("-- ============================================================");
lines.push("");

// Batch insert in groups of 50 for efficiency
const batchSize = 50;
for (let i = 0; i < photos.length; i += batchSize) {
  const batch = photos.slice(i, i + batchSize);
  const values = batch.map((p) => {
    const createdAt = p.createdAt ? `'${esc(p.createdAt)}'` : "NULL";
    return `('${esc(p.id)}', '${esc(p.title)}', '${esc(p.photographerId)}', '${esc(p.photographer)}', '${esc(p.license)}', '${esc(p.category)}', '${esc(p.location)}', '${esc(p.color)}', '${esc(p.orientation)}', '${esc(p.ratio)}', ${p.price}, ${p.downloads}, ${p.views}, ${p.likes}, '${esc(p.camera)}', '${esc(p.lens)}', ${p.iso}, ${arr(p.keywords)}, '${esc(p.image)}', ${createdAt})`;
  });

  lines.push(`INSERT INTO public.photos (id, title, photographer_id, photographer_name, license, category, location, color, orientation, ratio, price, downloads, views, likes, camera, lens, iso, keywords, image, created_at) VALUES`);
  lines.push(values.join(",\n") + ";");
  lines.push("");
}

console.log(lines.join("\n"));
