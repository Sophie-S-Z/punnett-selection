import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {rateSpecimen} from "@/app/selection/ecosystem-actions";
export async function POST(request:Request) {
 const origin=request.headers.get("origin");
 if(origin && origin!==new URL(request.url).origin) return NextResponse.json({ok:false,error:"Request origin was rejected."},{status:403});
 try {
  const client=await createClient();
  const {data,error}=await client.auth.getUser();
  if(error || !data.user) return NextResponse.json({ok:false,error:"Put on lab gloves before rating field notes."},{status:401});
  const body:unknown=await request.json();
  if(!body || typeof body!=="object" || !("captionId" in body) || typeof body.captionId!=="string" || !("vote" in body) || (body.vote!==1 && body.vote!==-1)) return NextResponse.json({ok:false,error:"Choose a specimen and a survival rating."},{status:400});
  const result=await rateSpecimen(body.captionId,body.vote);
  return NextResponse.json(result,{status:result.ok?200:result.duplicate?409:400});
 } catch {return NextResponse.json({ok:false,error:"Your rating could not be processed. Try again."},{status:400});}
}
