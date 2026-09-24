# Schema verification

No database queries are used in W1.
W2 requires live verification of `lab_specimens` before implementation.
Expected columns: `id` (int8 identity), `code` (text), `label` (text), `notes` (text).
These columns are not yet verified against Supabase.
The human owner creates the table and adds 5 to 8 rows under AGENTS.md section 5.2.
