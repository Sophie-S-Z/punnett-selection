export const discoveryHabitats = ["surprise", "fauna", "flora", "fungi", "city", "ocean"] as const;
export type DiscoveryHabitat = typeof discoveryHabitats[number];
export type DiscoverySuggestion = {commonName: string; scientificName: string};
export type DiscoveryProposal = {id: string; status: "ready" | "published"; label: string; notes: string; gbifKey: number; kingdom: string; wikipediaUrl: string; revision: string; imageId?: string};
export type DiscoveryResult = {ok:true; proposal:DiscoveryProposal} | {ok:false; error:string};
const scientificPattern = /^[A-Z][a-z]+ [a-z][a-z-]+$/;
const commonPattern = /^[\p{L}\p{N}][\p{L}\p{N} '\u2019-]{1,85}$/u;
function record(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid discovery response.");
 return value as Record<string, unknown>;
}
export function buildDiscoveryPrompt(habitat: string, existing: string[]): string {
 if (!discoveryHabitats.includes(habitat as DiscoveryHabitat)) throw new Error("Choose a research habitat.");
 return ["Propose ONE real living species of animal, plant, or fungus with odd natural history, suitable for dry, wild comedy field notes.",
 `Research focus: ${habitat === "city" ? "species genuinely found in New York City parks, gardens, or waterways" : habitat}.`,
 "Give a genuine common name and exact current Latin binomial only. No jokes, invented taxa, extinct species, humans, or descriptions of an app. Prefer overlooked organisms whose Wikipedia introduction contains unusual facts.",
 `Avoid these existing specimens: ${JSON.stringify(existing.slice(-100)).slice(0,10000)}`,
 "Return a JSON object with only commonName and scientificName. The server will check the taxon and retrieve its source facts."].join("\n").slice(0,12000);
}
export function discoveryRequest(prompt: string) {
 return {contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:1,maxOutputTokens:2048,responseFormat:{text:{mimeType:"APPLICATION_JSON",schema:{type:"object",properties:{commonName:{type:"string"},scientificName:{type:"string"}},required:["commonName","scientificName"],additionalProperties:false}}}}};
}
export function parseDiscoverySuggestion(value: unknown): DiscoverySuggestion {
 const candidates=record(value).candidates;
 const candidate=record(Array.isArray(candidates) ? candidates[0] : null);
 if(candidate.finishReason!=="STOP") throw new Error("Species proposal did not finish.");
 const parts=record(candidate.content).parts;
 if(!Array.isArray(parts)) throw new Error("No species proposal returned.");
 const text=parts.map(record).filter(part=>part.thought!==true).map(part=>typeof part.text==="string"?part.text:"").join("");
 const result=record(JSON.parse(text));
 if(typeof result.commonName!=="string" || !commonPattern.test(result.commonName) || /\b(website|dashboard|app|unicorn)\b/i.test(result.commonName) || typeof result.scientificName!=="string" || !scientificPattern.test(result.scientificName)) throw new Error("Species proposal is not a scientific binomial.");
 return {commonName:result.commonName,scientificName:result.scientificName};
}
export function verifyTaxon(value: unknown, scientificName: string, habitat?:string): {gbifKey:number;kingdom:string} {
 const match=record(value);
 if(match.matchType!=="EXACT" || match.rank!=="SPECIES" || match.status!=="ACCEPTED" || match.canonicalName!==scientificName || typeof match.confidence!=="number" || match.confidence<95 || typeof match.usageKey!=="number" || !Number.isSafeInteger(match.usageKey) || match.usageKey<=0 || typeof match.kingdom!=="string" || !["Animalia","Plantae","Fungi"].includes(match.kingdom) || match.extinct===true) throw new Error("Taxonomy registry did not confirm this living species.");
 const expected=habitat==="fauna"?"Animalia":habitat==="flora"?"Plantae":habitat==="fungi"?"Fungi":null;
 if(expected && match.kingdom!==expected) throw new Error("Species does not match the chosen research focus.");
 return {gbifKey:match.usageKey,kingdom:match.kingdom};
}
function wikiLink(value: unknown): string {
 if(typeof value!=="string") throw new Error("Missing encyclopedia source.");
 const url=new URL(value);
 if(url.origin!=="https://en.wikipedia.org" || !url.pathname.startsWith("/wiki/") || url.username || url.password || url.search || url.hash) throw new Error("Invalid encyclopedia source.");
 return url.toString();
}
export function parseSourceSummary(value: unknown, scientificName: string): {facts:string;wikipediaUrl:string;revision:string} {
 const summary=record(value);
 if(summary.type!=="standard" || typeof summary.extract!=="string" || summary.extract.length<60 || !summary.extract.toLowerCase().includes(scientificName.toLowerCase()) || typeof summary.revision!=="string" || !/^\d+$/.test(summary.revision)) throw new Error("No matching natural-history source was found.");
 const wikipediaUrl=wikiLink(record(record(summary.content_urls).desktop).page);
 const head=summary.extract.slice(0,450);
 const sentenceEnd=head.lastIndexOf(".");
 const facts=summary.extract.length>450 && sentenceEnd>80 ? head.slice(0,sentenceEnd+1) : head;
 return {facts,wikipediaUrl,revision:summary.revision};
}
export function parseProposal(value: unknown): DiscoveryProposal {
 const proposal=record(value);
 if(typeof proposal.id!=="string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(proposal.id) || !["ready","published"].includes(String(proposal.status)) || typeof proposal.label!=="string" || !/^[^()]{2,90} \([A-Z][a-z]+ [a-z][a-z-]+\)$/.test(proposal.label) || typeof proposal.notes!=="string" || proposal.notes.length<60 || proposal.notes.length>450 || typeof proposal.gbifKey!=="number" || !Number.isSafeInteger(proposal.gbifKey) || proposal.gbifKey<=0 || typeof proposal.kingdom!=="string" || !["Animalia","Plantae","Fungi"].includes(proposal.kingdom) || typeof proposal.revision!=="string" || !/^\d+$/.test(proposal.revision)) throw new Error("Invalid saved species proposal.");
 const result:DiscoveryProposal={id:proposal.id,status:proposal.status as DiscoveryProposal["status"],label:proposal.label,notes:proposal.notes,gbifKey:proposal.gbifKey,kingdom:proposal.kingdom,wikipediaUrl:wikiLink(proposal.wikipediaUrl),revision:proposal.revision};
 if(proposal.status==="published") {
  if(typeof proposal.imageId!=="string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(proposal.imageId)) throw new Error("Missing published culture.");
  result.imageId=proposal.imageId;
 }
 return result;
}

export type SpeciesCitation={specimenId:number;label:string;gbifKey:number;wikipediaUrl:string;revision:string;kingdom:string};
export function parseSpeciesCitations(value: unknown): SpeciesCitation[] {
 if(!Array.isArray(value) || value.length>10000) throw new Error("Invalid species citations.");
 return value.map(item=>{
  const row=record(item);
  if(typeof row.specimenId!=="number" || !Number.isSafeInteger(row.specimenId) || row.specimenId<=0 || typeof row.label!=="string" || row.label.length>180 || typeof row.gbifKey!=="number" || !Number.isSafeInteger(row.gbifKey) || row.gbifKey<=0 || typeof row.revision!=="string" || !/^\d+$/.test(row.revision) || typeof row.kingdom!=="string" || !["Animalia","Plantae","Fungi"].includes(row.kingdom)) throw new Error("Invalid species citation.");
  return {specimenId:row.specimenId,label:row.label,gbifKey:row.gbifKey,wikipediaUrl:wikiLink(row.wikipediaUrl),revision:row.revision,kingdom:row.kingdom};
 });
}
