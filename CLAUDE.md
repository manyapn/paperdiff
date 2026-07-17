# Claude instructions for PaperDiff

Follow `AGENTS.md` and the nearest nested `AGENTS.md`.

Start each task by naming the component you own: frontend, RocketRide pipeline, or classifier/evaluation. Stay inside that ownership boundary unless the task explicitly requires a shared-contract change. If it does, make the smallest compatible change and call it out.

Priorities:

1. A reliable Compare-mode demo.
2. Traceable evidence and honest blocked/review states.
3. A clean ten-second product payoff.
4. Challenge mode only after the above is tested.

Before finishing, run the narrowest relevant tests and report exactly what remains mocked or unconfigured.
