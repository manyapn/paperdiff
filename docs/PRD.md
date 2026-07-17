# PaperDiff — Product Requirements Document

## Summary

PaperDiff is the verification layer that sits after citations. Two claims
can each be honestly sourced and still disagree — because they studied
different populations, measured different things, used different methods,
or covered different time windows. PaperDiff takes two claims or papers,
grounds each one in its actual source text, and tells you whether the
disagreement is real or just looks that way.

## Problem

Citing a source is not the same as being right, and "these two sources
disagree" is not the same as "one of them is wrong." Readers, researchers,
and fact-checkers currently have to manually pull up both sources, read
past the headline, and figure out for themselves whether a study on
teenagers actually contradicts a study on adults, or whether two papers
reporting different numbers are actually measuring the same thing with
different statistical conventions. That work is slow, easy to skip, and
easy to get wrong.

## Target users

- Researchers and journalists who need to quickly assess whether a public
  claim survives contact with its cited source.
- Readers evaluating competing claims on a contested topic (health,
  nutrition, social science) who want more than "which source do I trust
  more."
- Fact-checking and editorial teams who need a repeatable, inspectable
  process rather than a one-off judgment call.

## Product experience (Compare mode)

1. **Input.** The user pastes a URL/DOI or a claim for each of two sides.
2. **Grounding.** PaperDiff resolves each side to its actual source paper,
   fetches the real text, and extracts the paper's stated research
   question, population, exposure/intervention, outcome, method, and
   conclusion — never inferring a field that isn't explicitly stated.
3. **Alignment.** The two extractions are compared dimension by dimension.
   Each dimension is classified as equivalent, different-but-comparable,
   or materially incompatible, with a plain-language rationale.
4. **Verification.** For every dimension that could explain the apparent
   disagreement, PaperDiff checks two things in order: (a) is the cited
   evidence real, exact, and correctly attributed to its source — the
   deterministic provenance gate — and only if that passes, (b) does the
   passage actually support the claim, assessed either by the trained
   claim-evidence classifier or, when it isn't available, a capped
   prompted-LLM fallback. Failed provenance is always `Blocked`,
   regardless of how confident the second check is.
5. **Verdict.** PaperDiff produces one of: no real conflict (the sides
   answer different questions), a method-driven disagreement (same
   question, different analytical choice), or a genuine unresolved
   conflict — plus a plain-English synthesis a non-expert can read in ten
   seconds, and a full inspectable trace underneath for anyone who wants
   to check the work.

## Goals

- Every factual claim the product surfaces is traceable to a real source
  URL and an exact passage — no exceptions, no invented citations.
- The product is honest about uncertainty: `Needs review` and `Blocked`
  are first-class outcomes, not failure states to be hidden.
- A non-expert gets the ten-second payoff; an expert can open the trace
  and verify every step the system took to get there.
- The pipeline runs as a real, observable, production deployment — not a
  script on someone's laptop — so its behavior is reproducible and
  inspectable after the fact.

## Non-goals (for this version)

- PaperDiff does not establish scientific consensus or truth; it
  establishes whether two specific sources actually conflict.
- It does not replace expert review for high-stakes decisions.
- General-purpose paper search, a citation-network browser, or a
  universal "trust score" are explicitly out of scope.
- Challenge mode (proactively discovering contradicting/replicating
  papers for a single claim, rather than comparing two given inputs) is a
  stretch goal layered on top of Compare, not a requirement for it.

## Success metrics

- Pair-level field agreement and root-dimension recall against a curated,
  held-out set of real paper pairs (never used in training).
- Rate of unsupported claims incorrectly passed through as `Grounded` —
  target as close to zero as possible; this is the safety metric that
  matters most.
- End-to-end latency from submission to verdict.
- Whether a first-time viewer can state the correct verdict and its
  driving dimension within ten seconds of seeing the result.

## System boundaries

- Two independent extraction passes run in parallel and are held to one
  shared schema.
- A deterministic provenance gate (source origin, fetch success, paper
  identity, exact passage existence) always runs first and can never be
  overridden by a confident model.
- The claim-evidence verification step only ever answers one narrow
  question — does this exact passage support this exact claim — and
  never performs retrieval, extraction, or verdict-writing itself.
- The full pipeline runs as a deployed, traced, observable cloud
  workflow; the frontend is a thin static client that renders whatever
  the pipeline returns and never re-runs scientific judgment in the
  browser.
