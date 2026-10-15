import { createClient } from "@/lib/supabase/server";
import { validCaptionId } from "@/lib/punnett/rating";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
 const { id } = await context.params;
 if (!validCaptionId(id)) return new Response("Image not found.", { status: 404 });
 try {
  const client = await createClient();
  const { data: path, error } = await client.rpc("punnett_read_image", { image_id_input: id });
  if (error || typeof path !== "string" || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/.test(path)) return new Response("Image not found.", { status: 404 });
  const { data: image, error: downloadError } = await client.storage.from("caption-images").download(path);
  if (downloadError || !image) return new Response("Image not found.", { status: 404 });
  return new Response(await image.arrayBuffer(), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
 } catch { return new Response("Image could not be loaded.", { status: 503 }); }
}
