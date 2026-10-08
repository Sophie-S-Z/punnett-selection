import { createClient } from "@/lib/supabase/server";
import { validCaptionId } from "@/lib/punnett/rating";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validCaptionId(id)) return new Response("Image not found.", { status: 404 });
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("punnett_read_image", { image_id_input: id });
    if (error || typeof data !== "string") return new Response("Image not found.", { status: 404 });
    const match = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) return new Response("Image not found.", { status: 404 });
    const bytes = Buffer.from(match[2], "base64");
    return new Response(bytes, { headers: { "Content-Type": `image/${match[1]}`, "Cache-Control": "public, max-age=86400, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
  } catch {
    return new Response("Image could not be loaded.", { status: 503 });
  }
}
