import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && !url.searchParams.has("error")) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL("/", url.origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    } catch {
      // A network error should lead to a recoverable sign-in message.
    }
  }
  const response = NextResponse.redirect(new URL("/?auth=failed", url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
