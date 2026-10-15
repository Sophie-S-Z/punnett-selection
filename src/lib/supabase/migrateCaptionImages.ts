import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "./server";
import { validCaptionId } from "@/lib/punnett/rating";

/** Move the caller's recent meme images without exposing their bytes to client components. */
export async function migrateCaptionImages() {
 const client=await createClient();
 const { data:{user},error:authError }=await client.auth.getUser();
 if(authError || !user) return;
 const {data:rows,error}=await client.rpc("punnett_legacy_image_page");
 if(error || !Array.isArray(rows)) return;
 for(const row of rows) {
  if(typeof row?.id!=="string" || !validCaptionId(row.id) || typeof row.dataUrl!=="string") continue;
  const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(row.dataUrl);
  if(!match) continue;
  const bytes=Buffer.from(match[1],"base64");
  if(!bytes.length || bytes.length>2097152) continue;
  const path=user.id+"/"+randomUUID()+".jpg";
  const {error:uploadError}=await client.storage.from("caption-images").upload(path,bytes,{contentType:"image/jpeg",upsert:false});
  if(uploadError) continue;
  const {data:saved,error:saveError}=await client.rpc("punnett_migrate_image",{image_id_input:row.id,image_path_input:path});
  // A concurrent request may already have migrated this image. Remove only the redundant upload.
  if(!saveError && typeof saved==="string" && saved!==path) await client.storage.from("caption-images").remove([path]);
  // Keep an ambiguous upload for recovery. Never delete an image that may already be published.
 }
}
