import assert from "node:assert/strict";

const origin = process.env.PUNNETT_TEST_URL ?? "http://localhost:3000";
for (const path of ["/profile", "/lab/notebook"]) {
  const response = await fetch(new URL(path, origin), {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "first_name=Anonymous&last_name=Rejected",
  });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), origin).pathname, "/");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, "Load the existing Supabase environment before testing.");
for (const [path, body] of [
  ["punnett_get_profile", {}],
  ["punnett_save_profile", { first_name_input: "Anonymous", last_name_input: "Rejected", avatar_path_input: null }],
]) {
  const response = await fetch(`${url}/rest/v1/rpc/${path}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "42501");
}
console.log("Anonymous page submissions and profile read/write functions are rejected.");
