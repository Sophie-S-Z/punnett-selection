"use server";

import sharp from "sharp";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {buildDiscoveryPrompt,discoveryRequest,parseDiscoverySuggestion,verifyTaxon,parseSourceSummary,parseProposal} from "@/lib/punnett/discovery";
import type {DiscoveryResult} from "@/lib/punnett/discovery";
import {buildGenerationPrompt,geminiRequest,parseGeneratedCaptions} from "@/lib/punnett/generation";
import {specimenFactCard} from "@/lib/punnett/factCard";

function configuration() {
 const apiKey=process.env.GEMINI_API_KEY,model=process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
 if(!apiKey || !/^gemini-[a-z0-9.-]+$/.test(model)) throw new Error("The discovery station needs its Gemini configuration.");
 return {apiKey,model};
}
async function modelResponse(body: unknown, config:ReturnType<typeof configuration>) {
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":config.apiKey},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(35_000)});
 if(!response.ok) throw new Error("The species proposal could not be generated.");
 return response.json();
}
async function sourceResponse(url: string) {
 const response=await fetch(url,{headers:{"User-Agent":"PunnettSelection/1.0 (https://punnett-selection.vercel.app)",Accept:"application/json"},signal:AbortSignal.timeout(8_000),redirect:"error",cache:"no-store"});
 if(!response.ok) throw new Error("A species source could not be retrieved.");
 return response.json();
}

export async function discoverSpecies(habitat: string): Promise<DiscoveryResult> {
 let discoveryId: string | null=null;
 let client:Awaited<ReturnType<typeof createClient>>|null=null;
 try {
  client=await createClient();
  const {data,error}=await client.auth.getUser();
  if(error || !data.user) return {ok:false,error:"Put on lab gloves before discovering species."};
  const {data:catalog,error:catalogError}=await client.from("lab_specimens").select("label").order("id");
  if(catalogError || !catalog?.length || !catalog.every(row=>typeof row.label==="string")) return {ok:false,error:"The shared species catalog could not be read. Ask the owner to check lab_specimens access."};
  const prompt=buildDiscoveryPrompt(habitat,catalog.map(row=>row.label)),config=configuration();
  const {data:started,error:startError}=await client.rpc("punnett_begin_discovery",{prompt_input:prompt,model_input:config.model});
  if(startError || !started?.id) return {ok:false,error:startError?.message?.includes("discovery_daily_limit")?"The lab allows three discovery attempts in 24 hours. Try culturing an existing species instead.":"The discovery station is unavailable. Ask the lab owner to apply the discovery database extension."};
  discoveryId=started.id;
  const suggestion=parseDiscoverySuggestion(await modelResponse(discoveryRequest(prompt),config));
  if(catalog.some(row=>row.label.toLowerCase().includes(`(${suggestion.scientificName.toLowerCase()})`))) throw new Error("The proposed organism is already in the shared lab.");
  const [taxonomy,summary]=await Promise.all([
   sourceResponse(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(suggestion.scientificName)}&strict=true`),
   sourceResponse(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(suggestion.scientificName.replaceAll(" ","_"))}`),
  ]);
  const taxon=verifyTaxon(taxonomy,suggestion.scientificName,habitat),source=parseSourceSummary(summary,suggestion.scientificName);
  // Do not publish a source that cannot fit the persisted generation prompt.
  buildGenerationPrompt("",{label:`${suggestion.commonName} (${suggestion.scientificName})`,notes:source.facts});
  const {data:proposal,error:prepareError}=await client.rpc("punnett_prepare_discovery",{discovery_id_input:discoveryId,label_input:`${suggestion.commonName} (${suggestion.scientificName})`,notes_input:source.facts,gbif_key_input:taxon.gbifKey,kingdom_input:taxon.kingdom,wikipedia_url_input:source.wikipediaUrl,revision_input:source.revision});
  if(prepareError) throw new Error("The species proposal could not be saved.");
  return {ok:true,proposal:parseProposal(proposal)};
 } catch {
  if(discoveryId && client) {try {await client.rpc("punnett_fail_discovery",{discovery_id_input:discoveryId});} catch { /* Keep pending attempts in the quota; never leak provider details. */ }}
  return {ok:false,error:"This proposal did not pass the taxonomy and source checks. Nothing was published. Try another habitat, or culture a species already in the lab."};
 }
}

export async function publishDiscovery(proposalId: string): Promise<{ok:true;imageId:string}|{ok:false;error:string}> {
 try {
  const client=await createClient();
  const {data,error}=await client.auth.getUser();
  if(error || !data.user) return {ok:false,error:"Put on lab gloves before publishing a species."};
  if(typeof proposalId!=="string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(proposalId)) return {ok:false,error:"Choose a saved species proposal."};
  const {data:saved,error:readError}=await client.rpc("punnett_discovery_proposal",{discovery_id_input:proposalId});
  if(readError) return {ok:false,error:"This proposal is unavailable. Start a new discovery."};
  const proposal=parseProposal(saved);
  if(proposal.status==="published" && proposal.imageId) return {ok:true,imageId:proposal.imageId};
  const {error:claimError}=await client.rpc("punnett_claim_discovery",{discovery_id_input:proposalId});
  if(claimError) return {ok:false,error:claimError.message.includes("publication_attempt_limit")?"This proposal has used its three culture attempts. Start a new expedition or culture an existing species.":"This proposal was recently submitted. Wait one minute before retrying."};
  const source={label:proposal.label,notes:proposal.notes},prompt=buildGenerationPrompt("Wild, original, dry scientific comedy.",source),config=configuration();
  const jpeg=await sharp(Buffer.from(specimenFactCard(source))).jpeg({quality:80}).toBuffer();
  const captions=parseGeneratedCaptions(await modelResponse(geminiRequest(prompt,jpeg.toString("base64")),config),source);
  const {data:published,error:publishError}=await client.rpc("punnett_publish_discovery",{discovery_id_input:proposalId,image_data_url:`data:image/jpeg;base64,${jpeg.toString("base64")}`,prompt_input:prompt,model_input:config.model,captions_input:captions});
  if(publishError || !published?.image_id) return {ok:false,error:publishError?.message?.includes("daily_limit")?"Your culture limit has been reached. This proposal is still saved; try again later.":"The culture could not be saved. Your proposal remains available; try publishing again."};
  for(const path of ["/","/specimens","/incubator","/discover"]) revalidatePath(path);
  return {ok:true,imageId:published.image_id};
 } catch {return {ok:false,error:"The field notes could not be generated or saved. Your proposal is still available. Try publishing again."};}
}
