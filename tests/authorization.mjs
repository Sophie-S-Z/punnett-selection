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
  ["punnett_list_bench", {}],
  ["punnett_save_bench", { id_input: "954a0308-1972-40ba-8e22-8299c57777fd", label_input: "Anonymous", notes_input: "", revision_input: 0 }],
  ["punnett_delete_bench", { id_input: "954a0308-1972-40ba-8e22-8299c57777fd", revision_input: 1 }],
]) {
  const response = await fetch(`${url}/rest/v1/rpc/${path}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "42501");
}
const table = await fetch(`${url}/rest/v1/punnett_bench_specimens?select=id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
assert.equal(table.status, 401);
assert.equal((await table.json()).code, "42501");
console.log("Anonymous page submissions, private bench table reads, and all profile/bench functions are rejected.");
