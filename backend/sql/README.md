# SQL Execution Order

For the V2 architecture, you must execute the SQL scripts in the following order to correctly deploy the bank-owned FX pooling network:

1. `schema.sql` (Note: running this alone sets up the V1 global marketplace without banks)
2. `001_add_agent_runs.sql`
3. `002_add_exporter_confirmed.sql`
4. `003_bank_owned_v2.sql`
5. `004_finish_bank_owned.sql`
6. `seed_demo.sql`

## Important Note on V1 vs V2
`schema.sql` is the original V1 bootstrap file that assumes a global marketplace. If you only run `schema.sql` without the subsequent migrations (`001` through `004`), you will recreate the legacy global architecture instead of the live V2 architecture. 
