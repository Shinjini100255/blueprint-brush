import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Only PNG and JPEG files are allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload original image
    const fileBytes = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(fileBytes);
    const timestamp = Date.now();
    const ext = file.type === "image/png" ? "png" : "jpg";
    const originalPath = `originals/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("blueprints")
      .upload(originalPath, fileBuffer, { contentType: file.type });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: originalUrlData } = supabase.storage
      .from("blueprints")
      .getPublicUrl(originalPath);
    const originalUrl = originalUrlData.publicUrl;

    // Convert image to base64 for AI
    const base64Image = btoa(
      String.fromCharCode(...fileBuffer)
    );
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Call Lovable AI Gateway for colorization
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Colorize this black and white architectural blueprint into a realistic modern architectural rendering. Preserve exact structure. Add realistic materials, walls, floors, greenery, shadows, and lighting. Do not alter layout.",
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI request failed: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const generatedImageUrl =
      aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      throw new Error("No image returned from AI");
    }

    // Decode base64 result and upload
    const base64Part = generatedImageUrl.split(",")[1];
    const coloredBytes = Uint8Array.from(atob(base64Part), (c) =>
      c.charCodeAt(0)
    );
    const coloredPath = `colored/${timestamp}.png`;

    const { error: coloredUploadError } = await supabase.storage
      .from("blueprints")
      .upload(coloredPath, coloredBytes, { contentType: "image/png" });

    if (coloredUploadError) {
      throw new Error(`Colored upload failed: ${coloredUploadError.message}`);
    }

    const { data: coloredUrlData } = supabase.storage
      .from("blueprints")
      .getPublicUrl(coloredPath);
    const coloredUrl = coloredUrlData.publicUrl;

    // Insert into database
    const { error: dbError } = await supabase.from("blueprints").insert({
      original_url: originalUrl,
      colored_url: coloredUrl,
    });

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ original_url: originalUrl, colored_url: coloredUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
