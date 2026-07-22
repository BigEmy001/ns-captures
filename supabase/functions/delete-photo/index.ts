import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cloudinaryCloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;
    const cloudinaryApiKey = Deno.env.get("CLOUDINARY_API_KEY")!;
    const cloudinaryApiSecret = Deno.env.get("CLOUDINARY_API_SECRET")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { photoId } = await req.json();

    if (!photoId) {
      return new Response(JSON.stringify({ error: "photoId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: photo, error: photoError } = await adminClient
      .from("photos")
      .select("id, photographer_id, image")
      .eq("id", photoId)
      .single();

    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    const isOwner = photo.photographer_id === user.id;

    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Not authorized to delete this photo" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (photo.image) {
      const url = new URL(photo.image);
      const pathParts = url.pathname.split("/");
      const versionIndex = pathParts.findIndex(
        (p) => p.startsWith("v") && /^\d+$/.test(p.slice(1)),
      );
      const publicId =
        versionIndex !== -1
          ? pathParts
              .slice(versionIndex + 1)
              .join("/")
              .replace(/\.[^.]+$/, "")
          : pathParts
              .slice(pathParts.indexOf("upload") + 1)
              .join("/")
              .replace(/\.[^.]+$/, "");

      try {
        const timestamp = Math.round(Date.now() / 1000);
        const signature = await crypto.subtle.digest(
          "SHA-1",
          new TextEncoder().encode(
            `public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`,
          ),
        );
        const signatureHex = Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/destroy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_id: publicId,
            timestamp,
            api_key: cloudinaryApiKey,
            signature: signatureHex,
          }),
        });
      } catch {
        // Continue with DB delete even if Cloudinary fails
      }
    }

    await adminClient.from("user_likes").delete().eq("photo_id", photoId);
    await adminClient.from("user_saves").delete().eq("photo_id", photoId);

    const { error: deleteError } = await adminClient.from("photos").delete().eq("id", photoId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
