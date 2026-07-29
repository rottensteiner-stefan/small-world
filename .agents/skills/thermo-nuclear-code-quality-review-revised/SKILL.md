---
name: thermo-nuclear-code-quality-review-revised
description: Run an uncompromising, evidence-backed review that seeks behavior-preserving code-judo simplifications and verifies maintainability, tests, seams, and feedback loops.
disable-model-invocation: true
---

# Thermo-Nuclear Code Quality Review

## Mandate

Review the change and the architecture it enters, not only the edited lines. Search for a **code-judo** move: a behavior-preserving reframe that deletes branches, modes, helpers, layers, or concepts instead of redistributing them. Accept some concrete false positives in exchange for exposing otherwise invisible simplifications, but label inference and make every concern quick to verify or reject.

## 1. Establish the change contract

Inspect the complete diff, the surrounding call paths and ownership boundaries, related tests, and existing utilities or models. Determine:

- the intended behavior and invariants;
- every meaningful success, edge, and failure path changed;
- the modules, state, APIs, and external effects involved;
- relevant repository conventions and validation commands;
- line counts before and after the change for each substantially enlarged file.

Run focused read-only checks when practical. Record missing context or checks that cannot run; do not convert absence of evidence into a finding.

**Completion gate:** Account for every meaningful changed behavior and affected path, identify its current owner and verification surface, and state all material evidence limitations.

## 2. Pressure-test the structure

For each meaningful change, trace the data and control flow beyond the diff, then test the following concerns. Co-locate evidence, impact, and the smallest credible structural remedy in each candidate finding.

### Code-judo and complexity

Inventory concepts introduced or multiplied: branches, flags, nullable modes, fallbacks, wrappers, helpers, state transitions, and layers. Compare them with the simplest design supported by the existing architecture. Prefer a reframe that removes concepts; moving the same complexity among helpers is not a simplification.

Raise a concern when a specific alternative can delete meaningful incidental complexity without changing behavior. Name what disappears and why the alternative preserves the contract.

### Ownership, abstractions, and contracts

Locate the canonical owner of each rule and the nearest existing helper, model, or extension point. Check whether feature logic is scattered through shared flows, duplicated, or placed outside that owner. Follow values across boundaries and inspect casts, `any`/`unknown`, optional parameters, silent fallbacks, generic machinery, and pass-through wrappers for obscured invariants or unjustified indirection.

Raise a concern when the evidence identifies a canonical home or a clearer contract and shows how using it reduces coupling, duplication, or control-flow states.

### Size and navigability

Treat a change that pushes a file from below 1,000 lines to above 1,000 as a presumptive blocker. Report the before/after counts and a cohesive extraction boundary. Waive it only when the file must remain whole for a concrete structural reason and remains easy to navigate. Apply judgment to already-large or generated files; the threshold is a forcing function, not a substitute for analysis.

### Orchestration and state

Derive actual dependency and commit boundaries. Flag serialization only when operations are independent and concurrency preserves ordering, error, and resource constraints. Flag non-atomic updates only when a reachable failure can expose partial state; identify the failure point and a transaction, staging, idempotency, or compensation boundary that closes it.

**Completion gate:** Evaluate every concern above for every meaningful change. For each plausible issue, either validate it with concrete repository evidence or record why it was rejected. Measure every threshold crossing rather than estimating it.

## 3. Verify tests, seams, observability, and feedback loops

Build a compact verification matrix for each changed behavior:

| Surface               | Evidence required                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tests                 | A focused assertion covers the new or changed success path and proportionate edge/failure paths. Inspect assertions and failure sensitivity; test presence or a green suite alone is insufficient.                                               |
| Seam                  | Deterministic business decisions can be exercised without unrelated network, filesystem, clock, process, UI, or global-state orchestration. The seam may be an existing function/module boundary; do not demand an interface solely for mocking. |
| Failure observability | Failures reach a caller, log, metric, trace, or user-visible result with enough operation and cause context to diagnose them. Silent fallback, swallowed errors, and ambiguous partial success require explicit justification.                   |
| Feedback loop         | A documented or discoverable focused command gives deterministic, reasonably fast evidence for the changed behavior. The structure makes the next behavior change locally testable rather than requiring broad integration setup.                |

Run the narrowest relevant checks, then broader checks when risk and cost justify them. A missing test is a finding only when you can name the unverified behavior and an assertion that would fail under a plausible regression. A seam concern must identify the logic trapped behind which effect. An observability concern must identify the reachable failure and the missing signal or context.

**Completion gate:** Map every changed behavior to test evidence, a testable seam, failure signal, and runnable feedback command, or report a concrete gap for that cell. Record commands and outcomes.

## 4. Validate and write findings

Challenge each candidate against the code, tests, and history or conventions available locally. Separate observed facts from inferences. Prefer a few high-conviction structural findings over cosmetic notes.

Each finding must include:

1. severity and precise location;
2. observed evidence, including the relevant path or reachable scenario;
3. maintainability or verification impact;
4. an actionable remedy, favoring deletion or a simpler ownership/model boundary;
5. a check that would demonstrate completion.

Use **blocker** for an evidenced structural or verification defect that should prevent approval, and **major** for material debt with bounded impact. Omit low-value style findings unless they expose a recurring structural pattern.

**Completion gate:** Every reported finding is independently checkable, distinguishes fact from inference, proposes a credible end state, and includes a verification condition. Remove duplicates and unsupported suspicions.

## 5. Apply the approval gate and report

Report, in order:

1. `APPROVE` or `CHANGES REQUESTED`;
2. blocker findings, then major findings;
3. validation commands and outcomes;
4. evidence limitations and residual risks.

Request changes when any of these remain:

- a credible code-judo reframe would remove substantial incidental complexity;
- branching, ownership drift, duplication, indirection, or an obscured contract materially worsens reasoning cost;
- a sub-1,000-line file crosses 1,000 lines without a measured, compelling reason to remain whole;
- changed behavior lacks proportionate regression evidence or is trapped behind effects without a focused verification seam;
- a reachable failure is silent, ambiguous, or can expose unjustified partial state;
- the relevant checks fail, or a material behavior cannot be verified and the resulting risk is unacceptable.

Approve only after all five step gates pass. If no findings survive validation, say so explicitly; never invent a concern to make the review look strict.

**Completion gate:** The verdict follows from the listed evidence, every blocker maps to an approval condition above, and the report contains enough detail for the author to fix or falsify each finding without guessing.
