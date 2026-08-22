# What's Real vs. What's Mocked

Required disclosure per the hackathon brief (Section 6: submission format, Section 7: synthetic data rules, Section 10: scored explicitly under "What's Fake vs. What's Real"). This is the source of truth — the 1-Pager's disclosure section should match this, not the other way around.

## Real and running

| Component | Status |
|---|---|
| Auth, roles, RLS | Real — Supabase Auth issues real JWTs; FastAPI verifies them; Postgres RLS policies enforce exporter-can-only-see-own-data |
| Pooling algorithm (bucket matching, threshold → `suggested`) | Real — `pooling_service.py`, runs against live Postgres rows |
| Settlement math (pro-rata payout split) | Real — `settlement_service.py` |
| Forward rate formula (interest-rate-differential) | Real formula, fed synthetic inputs (see below) |
| Agent LLM calls | Real — every agent call in `agents.py` is a live request to Claude via AWS Bedrock, not a canned response. Every call and its output is logged to `agent_runs`. |
| Guardrail logic (self-correction validation, HITL execute gate, execution abort check) | Real — this is application code, not something a demo can fake; see `docs/ARCHITECTURE.md` |

## Synthetic / mocked — and what would need to be true in production

| Component | What's mocked now | What production needs |
|---|---|---|
| **FX spot rates** | Hardcoded constants in `rate_service.py` (`SPOT_RATE_INR_PER_UNIT = {"USD": 84.00, "EUR": 91.00, "GBP": 106.00}`), updated by hand | A live spot-rate feed (Reuters, Bloomberg, or a bank's own rate API). The formula shape (`Forward = Spot × (1+r_dom·t)/(1+r_for·t)`) doesn't change — only the spot/rate inputs need to become live. |
| **Bank roster & capacity** | `banks` and `bank_capacity` tables are seeded with fictional banks and made-up exposure limits, not real banking partners | A signed data-sharing or partnership agreement with at least one actual bank/NBFC willing to expose capacity/appetite programmatically, or a manual capacity-entry workflow if no API exists yet |
| **Compliance rules** | The Compliance Agent is told in its prompt to check against "typical SME forward limits" — this is the model's general knowledge, not a real RBI/IFSCA ruleset | A structured, versioned compliance rules table (per FEMA/RBI master directions on hedging, IFSCA guidelines for GIFT City) that the agent is grounded against, ideally with citations in its output |
| **KYC / compliance documents** | Seeded via `backend/scripts/seed_compliance_docs.py` with a synthetic PDF and randomly-assigned document types; document *verification* is a manual admin approve/reject action with no OCR or authenticity check behind it | Real document ingestion (OCR/extraction), and either a KYC vendor integration or a defined manual review SOP with audit trail |
| **Invoices, exporters, transaction history** | Test fixtures created through the app itself during the build — no real exporter has used this | Real onboarding flow, and ideally a pilot cohort of actual GIFT City / DGFT-registered exporters |
| **Exporter FIRC / Bill of Lading / shipment documents** | Referenced by category only; content isn't parsed or cross-checked | Document parsing + cross-referencing against invoice data, as described for the Trade Finance focus area in the brief |

## Known rough edges (disclosed, not hidden)

- `backend/scripts/seed_compliance_docs.py` currently has a hardcoded local file path for its dummy PDF (`/Users/.../media_....pdf`) — it degrades gracefully with a fallback filename if that path doesn't exist on the machine running it, but it should be replaced with a checked-in sample PDF before this script is handed to anyone else.
- The frontend's `.env.example` mentions a "demo mode with realistic sample data" that runs without a backend; the frontend README says the opposite ("no offline/preview mode... required"). Only the README is currently accurate — the demo-mode fallback described in the env comment isn't implemented. Worth fixing one or the other before a live demo, so a judge poking at `.env.example` doesn't get the wrong expectation.
- `agent_runs.agent_name` is typed as a fixed enum (`invoice`, `risk`, `pooling`, `compliance`, `orchestrator`) in `models/agent.py` but the code also logs `"bank_routing"` — the Pydantic response model will reject that row if the admin UI ever tries to fetch/validate agent-run history through that model.

## Why this disclosure matters more than it looks

The brief's third mandatory judge question is *"if you had to start this company Monday, what would you build first — and is it what you built tonight?"* The honest answer for FxPool is: **the bank partnership and the compliance ruleset**, not more agent polish. The agent pipeline can already run against real data the moment those two exist; everything mocked above is mocked because it requires a relationship or a regulatory grounding this team doesn't have at 2am during a hackathon — not because it was hard to code.