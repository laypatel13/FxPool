# Architecture

All agent code lives in [`backend/app/services/agents.py`](../backend/app/services/agents.py). This document explains what each agent does, how they're wired together, and — the part judges will ask about — what happens when one of them fails or produces something untrustworthy.

## Why six agents instead of one

A single "hedge this invoice" prompt would hide the decision points a real treasury officer actually cares about: is this invoice even plausible, is the exporter within their exposure limit, which bank has room for it, which existing pool (if any) it belongs in, and how risky is the pool that results. Splitting these into separate agents means each one has a narrow, auditable job, a fallback that can't be skipped, and its own row in `agent_runs` — so a judge (or a real compliance reviewer) can see exactly which decision was made by the model and which was made by deterministic code.

## The pipeline

`run_agent_pipeline(invoice)` in `agents.py` is the orchestrator. It runs in this order:

| Step | Agent | Input | Output | Runs in parallel with |
|---|---|---|---|---|
| 1 | **Invoice Agent** | invoice JSON | `is_plausible`, `reasoning`, `confidence` | Compliance Agent |
| 1 | **Compliance Agent** | invoice JSON | `compliance_status` (approved/flagged/rejected), `reasoning`, `confidence` | Invoice Agent |
| 2 | **Bank Routing Agent** | invoice + eligible banks + their current capacity | `bank_id`, `reasoning`, `confidence` | — |
| 3 | **Pooling Agent** | invoice + candidate pools at that bank + pool settings | `action` (assign/new), `pool_id`, `reasoning`, `confidence` | — |
| 4 | **Risk Agent** | invoice + the pool it landed in | `risk_score` (1–100), `reasoning`, `confidence` | — |

A sixth agent, the **Execution Agent**, runs later and separately — only after a human admin clicks **Execute** on a pool in the admin console. It is not part of the automatic pipeline; see Guardrails below.

Every agent call — including the orchestrator step itself — is logged to the `agent_runs` table (`_log_agent_run()`) with its raw input, raw output, a human-readable recommendation, and a confidence score. That log is what the admin console's agent-run history view reads from.

## Guardrails

The brief asks for either **self-correction** (one agent catching another's mistake) or a **human-in-the-loop** circuit. This build has both, at different points in the pipeline:

### 1. Self-correction — Bank Routing Agent
The model is asked to pick a `bank_id` from a list of eligible banks it was given. Before that choice is trusted, the orchestrator checks it against the actual candidate list (`any(b["id"] == output["bank_id"] for b in banks)`). If the model hallucinates a bank ID, returns something malformed, or the Bedrock call fails outright, the code silently falls back to a **deterministic rule**: route to whichever bank has the most exposure headroom (`max_exposure - current_exposure`) for that currency. The same pattern applies to the Pooling Agent — its chosen `pool_id` is validated against the actual candidate pools before being acted on; an invalid or "new" decision falls through to the deterministic bucket-matching logic in `pooling_service.assign_invoice_to_pool()`.

This means the pipeline never blocks or crashes on a bad model output — every agent that takes an action has a non-LLM fallback path, and every fallback is marked `is_fallback: true` in the logged output so it's visible in the admin UI which decisions were model-made versus rule-made.

### 2. Human-in-the-loop — pool execution
Two independent gates sit between "agents think this pool is ready" and "money actually moves":

- **Pool status ≠ auto-execute.** `pooling_service` only ever flips a pool's status to `suggested` once it crosses the minimum amount threshold. Nothing in the agent pipeline calls `execute_pool()`. An admin has to open the pool in the treasury console and click **Execute** — that's the sign-off.
- **Execution Agent's abort check.** Even after Execute is clicked, `run_execution_agent()` re-checks every invoice in the pool: if *any* invoice has `compliance_status == "rejected"` or `exporter_confirmed == False`, execution aborts and returns `None` — no rate gets locked, no invoice gets settled. This is a hard-coded safety valve, not a model decision, specifically so a flagged-but-unnoticed invoice can't slip through because an admin clicked through a pool without reading it.

### 3. Failure mode when the LLM itself is unreachable
`_invoke_bedrock()` tries a primary model (Claude 3.5 Sonnet v2) and falls back to a cheaper model (Claude 3 Haiku) on an access/validation error from Bedrock. If both fail, every agent has a hard-coded default (e.g. Invoice Agent defaults to `is_plausible: True, confidence: 50`, Compliance Agent defaults to `compliance_status: "not_checked"`) rather than throwing — the pipeline degrades to "flag everything for human review" instead of crashing the invoice submission flow.

## Data flow

```
POST /invoices (exporter)
    │
    ▼
invoices.py endpoint → indicative rate computed (rate_service.py)
    │
    ▼
run_agent_pipeline(invoice)   [agents.py]
    │
    ├─ Invoice + Compliance agents (parallel, ThreadPoolExecutor)
    ├─ Bank Routing Agent  → banks / bank_capacity tables
    ├─ Pooling Agent       → pools table (assign existing or create new)
    └─ Risk Agent          → risk_score attached to pool for admin review
    │
    ▼
Admin console shows pool + agent_runs history
    │
    ▼
Admin clicks Execute → run_execution_agent() → settlement_service.execute_pool()
    │
    ▼
(later) Admin clicks Settle → settlement_service.settle_pool()
```

## What this architecture does *not* yet do

Being upfront about the gaps, since the brief scores honesty here:

- There's no retry/backoff on Bedrock beyond the one primary→fallback model swap — a transient throttling error and a genuine access error are handled the same way.
- The Compliance Agent's "typical SME forward limits" are described to the model in the prompt, not enforced against a real regulatory ruleset (RBI/IFSCA guardrails) — see [`MOCKED_VS_REAL.md`](MOCKED_VS_REAL.md).
- Agent-to-agent communication is orchestrator-mediated (a single Python function calling each agent in sequence), not a message-passing/tool-use architecture between autonomous agents — a reasonable simplification for a 22-hour build, but a real "multi-agent" system in the stricter sense would let agents call each other or negotiate directly.