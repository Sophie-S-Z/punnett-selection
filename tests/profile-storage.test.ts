import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("the exact profile RPC saves without a photo and preserves an existing photo on a name-only edit", async () => {
  const db = new PGlite();
  const user = "00110000-0000-4000-8000-000000000001";
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      create schema storage;
      create table storage.buckets(id text, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    `);
    await db.exec(await readFile(new URL("../docs/w3-profiles.sql", import.meta.url), "utf8"));
    await db.query("insert into auth.users(id) values ($1)", [user]);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await db.exec("set role authenticated");
    async function save(first: string, photo: string | null) {
      const result = await db.query<{ profile: { first_name: string; avatar_path: string | null } }>(
        "select public.punnett_save_profile($1, 'Example', $2) as profile", [first, photo]);
      return result.rows[0].profile;
    }
    const withoutPhoto = await save("New user", null);
    assert.equal(withoutPhoto.first_name, "New user");
    assert.equal(withoutPhoto.avatar_path, null);
    const path = `${user}/photo.jpg`;
    assert.equal((await save("With photo", path)).avatar_path, path);
    const edited = await save("Edited name", null);
    assert.equal(edited.first_name, "Edited name");
    assert.equal(edited.avatar_path, path);
  } finally { await db.close(); }
});
