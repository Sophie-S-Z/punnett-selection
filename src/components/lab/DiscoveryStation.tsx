"use client";
import Link from "next/link";
import {useRef,useState} from "react";
import {discoverSpecies,publishDiscovery} from "@/app/discover/actions";
import type {DiscoveryHabitat,DiscoveryProposal} from "@/lib/punnett/discovery";
import {LabLoader} from "./LabLoader";
import {toast} from "sonner";

const habitats:Array<{value:DiscoveryHabitat;label:string;detail:string}>=[{value:"surprise",label:"Uncharted",detail:"Anything improbable"},{value:"fauna",label:"Fauna",detail:"Questionable animals"},{value:"flora",label:"Flora",detail:"Plants with agendas"},{value:"fungi",label:"Fungi",detail:"Forest-floor oddities"},{value:"city",label:"City wild",detail:"A New York field trip"},{value:"ocean",label:"Deep blue",detail:"Marine absurdity"}];
export function DiscoveryStation({initialProposal=null}:{initialProposal?:DiscoveryProposal|null}) {
 const [habitat,setHabitat]=useState<DiscoveryHabitat>("surprise"),[proposal,setProposal]=useState<DiscoveryProposal|null>(initialProposal),[pending,setPending]=useState<"discover"|"publish"|null>(null),[error,setError]=useState(""),[imageId,setImageId]=useState<string|null>(initialProposal?.imageId ?? null);
 const busy=useRef(false);
 async function discover() {
  if(busy.current) return;
  busy.current=true;setPending("discover");setError("");setProposal(null);setImageId(null);
  try {const result=await discoverSpecies(habitat);if(result.ok){setProposal(result.proposal);window.history.replaceState(null,"",`/discover?proposal=${encodeURIComponent(result.proposal.id)}`);}else setError(result.error);}
  catch {setError("The expedition could not finish. Check your connection and try again.");}
  finally {busy.current=false;setPending(null);}
 }
 async function publish() {
  if(busy.current || !proposal) return;
  busy.current=true;setPending("publish");setError("");
  try {const result=await publishDiscovery(proposal.id);if(result.ok){setImageId(result.imageId);toast.success("Species and field notes released into the ecosystem.");}else setError(result.error);}
  catch {setError("The culture could not be saved. Try publishing again.");}
  finally {busy.current=false;setPending(null);}
 }
 return <section className="discovery-station" aria-label="Species discovery" aria-busy={Boolean(pending)}>
  <div className="expedition-controls"><p className="eyebrow">01 · Choose your habitat</p><h2>Where should we look?</h2><fieldset disabled={Boolean(pending)} className="habitat-options"><legend className="visually-hidden">Research habitat</legend>{habitats.map(item=><label key={item.value} className="habitat-option"><input type="radio" name="habitat" value={item.value} checked={habitat===item.value} onChange={()=>setHabitat(item.value)} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></label>)}</fieldset><button type="button" className="lab-button button-primary" onClick={()=>void discover()} disabled={Boolean(pending)}>{pending==="discover"?"Scouting…":"Discover a real species"}<span aria-hidden="true"> ↗</span></button><p className="field-help">User-initiated Gemini proposal. Up to three attempts per 24 hours. Unconfirmed proposals stay out of the shared lab.</p></div>
  <div className="expedition-result" aria-live="polite">{pending ? <LabLoader label={pending==="discover"?"Scouting…":"Hatching…"} description={pending==="discover"?"Proposing a species, checking its taxonomy, and retrieving its source facts.":"Writing distinct field notes and saving the species, prompts, and culture together."}/> : null}
   {proposal ? <article className="source-dossier"><p className="eyebrow">02 · Review the evidence · {proposal.kingdom}</p><h2>{proposal.label}</h2><p className="source-extract">{proposal.notes}</p><nav className="source-links" aria-label="Species sources"><a className="text-link" href={`https://www.gbif.org/species/${proposal.gbifKey}`} target="_blank" rel="noopener noreferrer">GBIF taxon ↗</a><a className="text-link" href={`${proposal.wikipediaUrl}?oldid=${proposal.revision}`} target="_blank" rel="noopener noreferrer">Wikipedia source revision ↗</a></nav><p className="field-help">Wikipedia excerpt · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Proposed common name; exact scientific name matched to GBIF. Generated jokes use only this excerpt.</p>{imageId ? <><p role="status" className="discovery-success">Released. This organism and its field notes are saved in the shared lab.</p><Link className="lab-button button-primary" href="/">Rate the ecosystem →</Link><Link className="text-link" href={`/?mode=duel&image=${encodeURIComponent(imageId)}`}>Compare its field notes →</Link></> : <button className="lab-button button-primary" type="button" onClick={()=>void publish()} disabled={Boolean(pending)}>Culture notes &amp; release species ↗</button>}</article> : !pending ? <div className="discovery-empty"><span className="empty-dish" aria-hidden="true"/><p className="eyebrow">Awaiting a field expedition</p><h2>The next strange organism is already out there.</h2><p>We discover existing species. We invent the punchlines.</p></div> : null}
   {error ? <p className="form-error" role="alert">{error}</p> : null}
  </div>
 </section>;
}
