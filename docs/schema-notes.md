# Schema verification

## W2

The local Supabase URL and anon key are configured in ignored `.env.local`.
A read-only request to `public.lab_specimens` returned HTTP 200 with `[]`.

Query used by `/specimens`:

```ts
supabase.from("lab_specimens").select("id, code, label, notes").order("id")
```

The API accepted `id`, `code`, `label`, and `notes`.
The response contained no error and no rows.
Column types, nullability, and identity settings remain unverified because no row was returned.
An empty array with no error can mean an empty table or an RLS filter (AGENTS.md section 3.7).
No RLS policies were created or changed.
