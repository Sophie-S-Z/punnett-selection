import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscoveryPrompt, parseDiscoverySuggestion, verifyTaxon, parseSourceSummary, parseProposal,parseSpeciesCitations } from "../src/lib/punnett/discovery.ts";

const suggestion = {commonName:"Peacock mantis shrimp",scientificName:"Odontodactylus scyllarus"};
const provider = (value: unknown) => ({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(value)}]}}]});
test("discovery requires a complete real-nomenclature proposal and ignores model thoughts",()=>{
 assert.deepEqual(parseDiscoverySuggestion(provider(suggestion)),suggestion);
 for(const value of [{...suggestion,scientificName:"website dashboard"},{...suggestion,commonName:"<script>"},{...suggestion,scientificName:"Unicorn"}]) assert.throws(()=>parseDiscoverySuggestion(provider(value)));
 assert.throws(()=>parseDiscoverySuggestion({candidates:[{finishReason:"MAX_TOKENS"}]}));
 assert.ok(buildDiscoveryPrompt("flora",["Gympie-gympie (Dendrocnide moroides)"]).includes("Dendrocnide moroides"));
 assert.throws(()=>buildDiscoveryPrompt("anything",[]));
});
test("taxonomy verification rejects invented, fuzzy, higher-rank, extinct, and non-biological matches",()=>{
 const match={usageKey:4316608,canonicalName:suggestion.scientificName,rank:"SPECIES",status:"ACCEPTED",confidence:99,matchType:"EXACT",kingdom:"Animalia"};
 assert.deepEqual(verifyTaxon(match,suggestion.scientificName),{gbifKey:4316608,kingdom:"Animalia"});
 assert.throws(()=>verifyTaxon(match,suggestion.scientificName,"flora"));
 for(const delta of [{matchType:"FUZZY"},{rank:"GENUS"},{confidence:20},{canonicalName:"Pipa pipa"},{kingdom:"Viruses"},{extinct:true},{status:"SYNONYM"}]) assert.throws(()=>verifyTaxon({...match,...delta},suggestion.scientificName));
});
test("source facts come from matched encyclopedia text, never from a suggested joke or arbitrary URL",()=>{
 const extract="Odontodactylus scyllarus is a mantis shrimp with raptorial claws. It inhabits the Indo-Pacific seabed and has exceptional vision.";
 const summary={type:"standard",title:suggestion.scientificName,revision:"123",extract,content_urls:{desktop:{page:"https://en.wikipedia.org/wiki/Odontodactylus_scyllarus"}}};
 assert.deepEqual(parseSourceSummary(summary,suggestion.scientificName),{facts:extract,wikipediaUrl:summary.content_urls.desktop.page,revision:"123"});
 for(const delta of [{type:"disambiguation"},{extract:"A website is a collection of pages."},{content_urls:{desktop:{page:"http://localhost/admin"}}},{revision:"bad"}]) assert.throws(()=>parseSourceSummary({...summary,...delta},suggestion.scientificName));
});
test("saved proposals validate server response fields and canonical source links before rendering",()=>{
 const proposal={id:"00000000-0000-4000-8000-000000000001",status:"ready",label:"Peacock mantis shrimp (Odontodactylus scyllarus)",notes:"Odontodactylus scyllarus is a real mantis shrimp with unusual claws.",gbifKey:4316608,kingdom:"Animalia",wikipediaUrl:"https://en.wikipedia.org/wiki/Odontodactylus_scyllarus",revision:"123"};
 assert.equal(parseProposal(proposal).label,proposal.label);
 assert.throws(()=>parseProposal({...proposal,wikipediaUrl:"javascript:alert(1)"}));
 assert.throws(()=>parseProposal({...proposal,gbifKey:-1}));
 assert.equal(parseSpeciesCitations([{specimenId:12,label:proposal.label,gbifKey:proposal.gbifKey,kingdom:proposal.kingdom,wikipediaUrl:proposal.wikipediaUrl,revision:proposal.revision}])[0].specimenId,12);
 assert.throws(()=>parseSpeciesCitations([{specimenId:12,label:proposal.label,gbifKey:proposal.gbifKey,kingdom:proposal.kingdom,wikipediaUrl:"https://evil.example/wiki/test",revision:proposal.revision}]));
});
