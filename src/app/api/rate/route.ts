import { openai } from "@/lib/openai";
import { STYLE_RATER_PROMPT } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function rateWithOpenAI(image: string): Promise<string> {
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

  return completion.choices[0]?.message?.content ?? "";
}

async function rateWithGemini(image: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const result = await model.generateContent([
    { text: STYLE_RATER_PROMPT + "\n\nRate this outfit. Be specific about what you see." },
    { inlineData: { data: base64Data, mimeType } },
  ]);

  return result.response.text();
}

export async function POST(request: Request) {
  const body = await request.json();
  const { image } = body as { image: string };

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  let raw: string;
  try {
    // Try OpenAI first, fall back to Gemini
    if (process.env.OPENAI_API_KEY) {
      try {
        raw = await rateWithOpenAI(image);
      } catch {
        // OpenAI failed (quota, etc.) — try Gemini
        if (process.env.GEMINI_API_KEY) {
          raw = await rateWithGemini(image);
        } else {
          throw new Error("OpenAI quota exceeded and no Gemini fallback configured");
        }
      }
    } else if (process.env.GEMINI_API_KEY) {
      raw = await rateWithGemini(image);
    } else {
      return Response.json(
        { error: "No AI API key configured" },
        { status: 500 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "ai_error", message: `AI service error: ${message}` },
      { status: 502 }
    );
  }

  // Gemini sometimes wraps response in ```json ... ```, strip it
  raw = raw.replace(/^```json\s*/, "").replace(/\s*```$/, "");

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
