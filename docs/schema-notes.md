# Schema verification

## W2

The local Supabase URL and anon key are configured in ignored `.env.local`.
A read-only request to `public.lab_specimens` first returned HTTP 200 with `[]`.
After the owner saved a public read policy, the same select returned six rows.
The page shows `LAB-001` through `LAB-006`.

Query used by `/specimens`:

```ts
supabase.from("lab_specimens").select("id, code, label, notes").order("id")
```

The API accepted `id`, `code`, `label`, and `notes`.
The response contains `id`, `code`, `label`, and `notes` for each row.
No RLS policies were created or changed by this repository.
