import assert from "node:assert/strict";
import test from "node:test";
import { buildGenerationPrompt, parseGeneratedCaptions, validateUpload, geminiRequest } from "../src/lib/punnett/generation.ts";
const response=(text: string,finishReason="STOP")=>({candidates:[{finishReason,content:{parts:[{text}]}}]});
test("uploads validate type and size before any model call",()=>{
 assert.equal(validateUpload({size:1,type:"image/jpeg"}),null);
 for(const file of [{size:0,type:"image/jpeg"},{size:8*1024*1024+1,type:"image/png"},{size:1,type:"image/svg+xml"}]) assert.ok(validateUpload(file));
});
test("general humor uses the image and preserves bounded tone instructions",()=>{
 const prompt=buildGenerationPrompt("Monday meetings");
 assert.match(prompt,/meme captions for the uploaded image/);assert.match(prompt,/Monday meetings/);
 assert.doesNotMatch(prompt,/natural-history|Scientific taxon|saved source facts/);
 assert.ok(buildGenerationPrompt('a'.repeat(1000)).length<=2000);assert.throws(()=>buildGenerationPrompt('a'.repeat(1001)));
});
test("provider output is complete, bounded and distinct",()=>{
 assert.deepEqual(parseGeneratedCaptions(response('[" This meeting could have been a nap. ","My ambition is offline."]')),["This meeting could have been a nap.","My ambition is offline."]);
 for(const invalid of ['["A"]','["A"," "]','["Same","same"]','[1,2]',JSON.stringify(["A","x".repeat(501)]),'not json']) assert.throws(()=>parseGeneratedCaptions(response(invalid)));
 assert.throws(()=>parseGeneratedCaptions(response('["A","B"]',"MAX_TOKENS")));
 assert.throws(()=>parseGeneratedCaptions({promptFeedback:{blockReason:"SAFETY"}}));
 assert.throws(()=>parseGeneratedCaptions(response(JSON.stringify(Array.from({length:7},(_,i)=>String(i))))));
});
test("Gemini receives transient JPEG bytes and structured JSON configuration",()=>{
 const body=geminiRequest("saved prompt","aGVsbG8=");
 assert.deepEqual(body.contents[0].parts,[{text:"saved prompt"},{inlineData:{mimeType:"image/jpeg",data:"aGVsbG8="}}]);
 assert.equal(body.generationConfig.responseFormat.text.mimeType,"APPLICATION_JSON");
});
