import { openai } from "@/lib/openai";
import { STYLE_RATER_PROMPT } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { image } = body as { image: string };

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: STYLE_RATER_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Rate this outfit. Be specific about what you see.",
            },
            {
              type: "image_url",
              image_url: { url: image, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.8,
    });

    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "ai_error", message: `AI service error: ${message}` },
      { status: 502 }
    );
  }

  try {
    const parsed = JSON.parse(raw);

    // If it's a valid rating (not an error), try to save it for logged-in users
    if (parsed.overall_score !== undefined) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Upload outfit image to storage
          let imageUrl: string | null = null;
          try {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            const ext = image.startsWith("data:image/png") ? "png" : "jpg";
            const ratingId = crypto.randomUUID();
            const filePath = `${user.id}/ratings/${ratingId}.${ext}`;

            const { data: uploadData } = await supabase.storage
              .from("outfits")
              .upload(filePath, buffer, {
                contentType: ext === "png" ? "image/png" : "image/jpeg",
                upsert: false,
              });

            if (uploadData?.path) {
              const { data: urlData } = supabase.storage
                .from("outfits")
                .getPublicUrl(uploadData.path);
              imageUrl = urlData.publicUrl;
            }
          } catch {
            // Image upload failed — still save the rating without image
          }

          await supabase.from("ratings").insert({
            user_id: user.id,
            overall_score: parsed.overall_score,
            vibe: parsed.vibe,
            ratings: parsed.ratings,
            roast: parsed.roast,
            compliment: parsed.compliment,
            tips: parsed.tips,
            celebrity_match: parsed.celebrity_match,
            image_url: imageUrl,
          });
        }
      } catch {
        // Saving to DB failed — don't block the response
      }
    }

    return Response.json(parsed);
  } catch {
    return Response.json({
      error: "no_outfit",
      message: "Couldn't analyze that image - try another photo! 📸",
    });
  }
}
