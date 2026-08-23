import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * The public face of a contributor proposal.
 *
 * The recipient has no account, so this runs with the service role and the
 * token is the only credential. Everything here therefore assumes the caller
 * is anonymous and possibly hostile:
 *
 *   - the token is checked before anything is read or written;
 *   - a proposal is answerable once, and only while it is live;
 *   - the response carries only what the recipient already knows about
 *     themselves, never another proposal and never the token of one;
 *   - accepting creates exactly one account, and a replayed accept returns
 *     the same outcome rather than a second account.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "!";
}

/** A slug that cannot collide with another contributor of the same name. */
function slugFor(name: string, userId: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "contributor";
  return `${base}-${userId.slice(0, 8)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server not configured" }, 500);

  let body: { token?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const token = (body.token || "").trim();
  const action = body.action || "view";

  // A token of the wrong shape never reaches the database.
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "Proposal not found" }, 404);
  if (!["view", "accept", "decline"].includes(action)) {
    return json({ error: "Unknown action" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: proposal, error } = await admin
    .from("contributor_proposals")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  // The same answer whether the token is wrong or the proposal is gone, so
  // this cannot be used to discover which tokens exist.
  if (error || !proposal) return json({ error: "Proposal not found" }, 404);

  const expired = new Date(proposal.expires_at).getTime() < Date.now();
  const settled = proposal.status === "accepted" || proposal.status === "declined";

  /** Only ever the recipient's own details — never the token, never anyone else's. */
  const publicView = (status: string) => ({
    reference: proposal.reference,
    name: proposal.name,
    email: proposal.email,
    location: proposal.location,
    occupation: proposal.occupation,
    body: proposal.body,
    status,
    issuedAt: proposal.issued_at,
    expiresAt: proposal.expires_at,
  });

  // ---- view -------------------------------------------------------------
  if (action === "view") {
    if (!settled && expired) {
      await admin.from("contributor_proposals").update({ status: "expired" }).eq("id", proposal.id);
      return json({ ok: true, proposal: publicView("expired") });
    }

    // First open marks it viewed, which is how an admin knows it arrived.
    if (proposal.status === "issued") {
      await admin
        .from("contributor_proposals")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", proposal.id);
      return json({ ok: true, proposal: publicView("viewed") });
    }

    return json({ ok: true, proposal: publicView(proposal.status) });
  }

  // ---- decline ----------------------------------------------------------
  if (action === "decline") {
    if (settled) return json({ ok: true, proposal: publicView(proposal.status) });
    if (expired) return json({ error: "This proposal has expired" }, 410);

    await admin
      .from("contributor_proposals")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", proposal.id);

    return json({ ok: true, proposal: publicView("declined") });
  }

  // ---- accept -----------------------------------------------------------
  if (proposal.status === "accepted") {
    // Replayed accept: report the existing outcome rather than making a second
    // account or leaking a fresh password.
    return json({ ok: true, alreadyAccepted: true, proposal: publicView("accepted") });
  }
  if (proposal.status === "declined") return json({ error: "This proposal was declined" }, 409);
  if (expired) return json({ error: "This proposal has expired" }, 410);

  const email = proposal.email.toLowerCase().trim();
  const password = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: proposal.name, role: "Contributor", plan: "Starter" },
  });

  if (createError || !created?.user) {
    // An address that already has an account is a real case: the person may
    // have signed up separately. Promote it rather than refusing them.
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!existingProfile) {
      return json({ error: createError?.message || "Could not create the account" }, 400);
    }

    await admin
      .from("profiles")
      .update({ role: "Contributor", verification_status: "verified", status: "Active" })
      .eq("id", existingProfile.id);

    await admin
      .from("contributor_proposals")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        created_user_id: existingProfile.id,
      })
      .eq("id", proposal.id);

    return json({ ok: true, existingAccount: true, proposal: publicView("accepted") });
  }

  const userId = created.user.id;
  const slug = slugFor(proposal.name, userId);

  // An invited contributor is vetted by having been chosen, so they arrive
  // verified rather than meeting the verification fee on the way in.
  await admin
    .from("profiles")
    .update({
      role: "Contributor",
      status: "Active",
      verification_status: "verified",
      slug,
      occupation: proposal.occupation || null,
      location: proposal.location || null,
    })
    .eq("id", userId);

  // Contributors need a photographers row: portfolios and payouts key off slug.
  await admin.from("photographers").upsert({ id: slug, name: proposal.name });

  await admin
    .from("contributor_proposals")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      created_user_id: userId,
    })
    .eq("id", proposal.id);

  return json({
    ok: true,
    password,
    email,
    proposal: publicView("accepted"),
  });
});
