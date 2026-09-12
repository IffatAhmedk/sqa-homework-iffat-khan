# AI workflow disclosure

**Tools used, and why**

* ChatGPT and Claude to review the challenge and turn it into a concrete checklist.
* Perplexity to compare LLM-evaluation frameworks and research the tradeoffs before choosing Promptfoo.
* Claude for most of the build work: inspecting the live app’s DOM/network behavior, speeding up test implementation, and debugging the Promptfoo/Gemini integration.

**Generated vs. rewritten**

* Claude generated the initial test scaffolding, helper functions, and locator strategy.
* I reviewed and rewrote from there: cleaned the code, moved API endpoint constants into a dedicated file for discoverability, set the assertions and wording for each test, defined the login test’s scope around the CAPTCHA constraint, and decided which 8 behaviors earned a slot.

**One thing AI got wrong that I caught**

* In the login-flow test, I was checking for any request containing `/api/` to verify the email check stayed client-side. A TikTok tracking request also contained `/api/`, so the test incorrectly flagged it as a backend leak.
* I caught it when a run failed despite our backend never being called, then narrowed the assertion to requests whose hostname is actually `ask.permission.ai`.

**What I built by hand / didn’t trust to AI**

* I made the final decisions on test selection, scope, assertions, and what was worth automating versus deliberately leaving out.
* I manually verified the live app behavior, especially around network calls, CAPTCHA constraints, and non-deterministic responses, rather than trusting generated assumptions.
* I handled anything involving real credentials or account creation myself.
* I also kept git commits and pushes manual so the history reflects my own pacing and decisions.
