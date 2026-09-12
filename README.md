# Permission.ai Agent - QA Take-Home

Playwright + TypeScript suite for the pre-login agent at `ask.permission.ai`, with Part 2's non-deterministic answer validation wired through Promptfoo.

# Setup

```bash
npm install
npx playwright install chromium
npm test
```

For the Part 2 LLM rubric:

```bash
export GEMINI_API_KEY=...  
npm test
```

Open the report with:

```bash
npm run report
```

# Test strategy (TL;DR)

8 tests total: the 4 required chat behaviors, email validation check on client-side, a mobile send-button flow, a stop-button network-abort test, and Part 2's answer validation.

Skipped deliberately: real authenticated login because reCAPTCHA makes it unreliable to automate without bypassing a control; real signup submission because it would create a fresh account on every run with no reset path; and exact-text assertions on anything AI-generated.

Waiting is based on network and render state throughout, never fixed sleeps.

# Key decisions

* **Locators:** `data-testid` first, role + accessible name second. Pills don't have test IDs, and message bubbles have no semantic hook at all, so plain text is the last resort there. I avoided CSS-class selectors because the Tailwind utilities are too tied to presentation.

* **Waiting:** the agent's “streaming” is actually one JSON response followed by a client-side typewriter animation. I found that by watching the network, so I wait for the real response and then poll until the full text finishes rendering instead of guessing with a timeout.

* Suggested pills only appear on a **second visit**. I found that while testing, so the setup deliberately does load → reload instead of assuming they're present on first load.

* I stopped the login test before real authentication. The form is reCAPTCHA-guarded, so I test a client-side, network-free negative path rather than trying to automate around it.

* I chose **Chromium** for mobile emulation instead of installing WebKit. The tradeoff is less Safari fidelity, but a much cleaner five-minute setup for the reviewer.

* The stop-button test holds the request open with `page.route()`. Racing a click against the real response wasn't reliable because the request often completes too quickly.

* For Part 2, deterministic assertions still do the basic gating, while Promptfoo handles the semantic part that normal assertions can't.

* Exploratory findings live under `notes/`, separate from the graded `artifacts/`, so they don't get mixed into the UX deliverable.

# AI disclosure

See [artifacts/ai-workflow.md](artifacts/ai-workflow.md).

# Next steps

* Add 1–2 post-login smoke tests once there is a safe seeded account and reset path.
* Add a `data-testid` to message bubbles to remove the one locator I still consider fragile.
* Run the Promptfoo rubric in CI for changes touching agent behavior.
* Expand Part 2 into a small golden-question set and run it nightly for drift.

# Submission checklist

* [ ] Repo named `sqa-homework-<first-last>`, default branch `main`
* [ ] Submitted as a new email, subject "Senior Quality Assurance Engineer – Take-Home Submission"
* [ ] README Setup + run commands verified from a clean clone
* [ ] README word count ≤ 500 (excluding commands/checkboxes)
* [ ] Max 8 tests; all 4 required behaviors covered
* [ ] `artifacts/assertions.md` (≤ 300 words)
* [ ] At least one assertion wired into an LLM-eval framework, running as part of the suite
* [ ] `artifacts/ux-review.md` (≤ 400 words, desktop + mobile, post-signup, 3–5 prioritized improvements)
* [ ] `artifacts/data-checks.md` (≤ 300 words + SQL)
* [ ] `artifacts/ai-workflow.md` (≤ 300 words, all 4 questions answered)
* [ ] `artifacts/report/` included
* [ ] `artifacts/demo.mp4` (60–90 sec, narrated)
* [ ] Commit history shows how the work evolved
