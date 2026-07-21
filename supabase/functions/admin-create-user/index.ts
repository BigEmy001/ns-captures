import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserBody {
  email: string;
  password?: string;
  name: string;
  role: "Buyer" | "Photographer" | "Enterprise" | "Admin";
  status?: "Active" | "Pending" | "Suspended" | "Blocked";
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  phone?: string;
  dob?: string;
  occupation?: string;
  location?: string;
  bio?: string;
}

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return random + "!";
}

async function checkIsAdmin(supabaseAnon: any, jwt: string): Promise<boolean> {
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(jwt);
  if (userError || !userData?.user) return false;

  const { data: profile, error: profileError } = await supabaseAnon
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) return false;
  return profile.role === "Admin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const isAdmin = await checkIsAdmin(anonClient, jwt);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden — admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: CreateUserBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, name, role } = body;
  if (!email || !name || !role) {
    return new Response(JSON.stringify({ error: "Missing required fields: email, name, role" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!["Buyer", "Photographer", "Enterprise", "Admin"].includes(role)) {
    return new Response(JSON.stringify({ error: "Invalid role" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const password =
    body.password && body.password.length >= 10 ? body.password : generateTempPassword();

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        plan: "Starter",
      },
    });

    if (createError || !createData?.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = createData.user.id;

    // Apply admin-chosen overrides on top of the trigger-created profile
    const profileUpdates: Record<string, unknown> = {
      role,
      status: body.status || "Active",
      verification_status: body.verificationStatus || "unverified",
    };
    if (body.phone) profileUpdates.phone = body.phone;
    if (body.dob) profileUpdates.dob = body.dob;
    if (body.occupation) profileUpdates.occupation = body.occupation;
    if (body.location) profileUpdates.location = body.location;
    if (body.bio) profileUpdates.bio = body.bio;

    const { error: profileError } = await adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("id", userId);

    if (profileError) {
      console.error("profile update failed", profileError);
    }

    // If Photographer role, ensure photographers table row exists
    if (role === "Photographer") {
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `user-${userId.slice(0, 8)}`;
      const { error: pgError } = await adminClient.from("photographers").upsert({
        id: slug,
        name,
        slug,
      });
      if (pgError) console.error("photographer row upsert failed", pgError);

      await adminClient.from("profiles").update({ slug }).eq("id", userId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: userId,
          email: createData.user.email,
          name,
          role,
          status: body.status || "Active",
          verificationStatus: body.verificationStatus || "unverified",
        },
        password,
        tempPasswordGenerated: !body.password || body.password.length < 10,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
