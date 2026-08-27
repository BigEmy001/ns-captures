/**
 * Refuses a commit that carries a credential.
 *
 * This is here because it already happened. The project's service_role key —
 * the one that bypasses every row-level security policy on the database, reads
 * every email address and identity document, and can reset any password — was
 * committed twice, in check_user.mjs and fix_ernie.mjs, to a public
 * repository. Deleting the files did not help: the blobs stay in history and
 * stay fetchable.
 *
 * A key that cannot be committed cannot leak this way. Scripts should read
 * from .env, which is ignored, and never hold the value themselves.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** What a leaked credential looks like in a diff. */
const PATTERNS = [
  {
    name: "Supabase service_role / JWT key",
    // A JWT whose payload decodes to a privileged role, rather than any JWT:
    // the anon key is meant to ship to the browser and is not a secret.
    re: /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g,
    privileged: (m) => {
      try {
        const claims = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
        return claims.role && claims.role !== "anon";
      } catch {
        return false;
      }
    },
  },
  { name: "Supabase management token", re: /sbp_[a-zA-Z0-9]{40}/g },
  { name: "AWS access key id", re: /AKIA[0-9A-Z]{16}/g },
  { name: "OpenAI key", re: /sk-[A-Za-z0-9]{32,}/g },
  { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const staged = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  // The scanner necessarily contains the patterns it looks for.
  .filter((f) => f !== "scripts/no-secrets.mjs");

const found = [];

for (const file of staged) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // binary, or deleted between staging and now
  }

  for (const { name, re, privileged } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      if (privileged && !privileged(match)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      found.push({ file, line, name });
    }
  }
}

if (found.length > 0) {
  console.error("\n  This commit carries credentials.\n");
  for (const f of found) {
    console.error(`    ${f.file}:${f.line}  ${f.name}`);
  }
  console.error(`
  Read the value from .env instead of writing it into the file:

      const env = Object.fromEntries(
        readFileSync(".env", "utf8").split("\\n").flatMap((l) => {
          const i = l.indexOf("=");
          return i > 0 ? [[l.slice(0, i).trim(), l.slice(i + 1).trim()]] : [];
        }),
      );

  Once a key reaches a commit, deleting the file does not withdraw it — the
  blob stays fetchable. It has to be rotated. Do not commit past this check
  without rotating first.
`);
  process.exit(1);
}
