import Link from "next/link";
import {LabHeader} from "@/components/lab/LabHeader";
import {DiscoveryStation} from "@/components/lab/DiscoveryStation";
import {requireUser} from "@/lib/supabase/user";
import {requireCompleteProfile} from "@/lib/supabase/profile";
import {createClient} from "@/lib/supabase/server";
import {parseProposal,type DiscoveryProposal} from "@/lib/punnett/discovery";

export const dynamic="force-dynamic";
export const maxDuration=60;
export default async function DiscoverPage({searchParams}:{searchParams:Promise<{proposal?:string}>}) {
 await requireUser();
 await requireCompleteProfile();
 const params=await searchParams;
 let proposal:DiscoveryProposal|null=null;
 if(params.proposal && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(params.proposal)) {
  try {const client=await createClient();const result=await client.rpc("punnett_discovery_proposal",{discovery_id_input:params.proposal});if(!result.error)proposal=parseProposal(result.data);} catch { /* Never disclose another owner's proposal. */ }
 }
 return <div className="lab-shell"><LabHeader /><main id="main" className="specimen-page"><p className="eyebrow">Field expedition · New arrivals</p><h1>Nature already<br />made it weird.</h1><p className="intro">Discover an existing animal, plant, or fungus. Review its source facts, then release a new culture of funny field notes into the ecosystem.</p><DiscoveryStation initialProposal={proposal} /><p className="field-help">The lab checks scientific names against GBIF and retrieves Wikipedia source text. These checks establish identity and provenance; they do not guarantee every scientific claim. Read the sources before publishing.</p><Link className="text-link" href="/incubator">Culture a species already in the lab →</Link></main><footer className="lab-footer"><span>The Humor Project</span><span>Real species. Fictional metaphors.</span></footer></div>;
}
