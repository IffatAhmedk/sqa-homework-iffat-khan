# Validating a non-deterministic response

Topic: **"What is passive earning"**. The wording changes every run, so none of these assertions depend on exact text.

## What we assert

* **Response size:** 40–1,500 characters. Enough to be a real answer, but not an obviously broken wall of text.
* **Topicality:** at least 3 of 4 concept families: "passive", earn/reward/ASK, "extension", and data/activity/share. The wording can vary; an off-topic answer should not pass.
* **Basic quality:** no "I'm not sure" fallback, leaked markup/template tokens, or encoding artifacts.
* **No repeated sentences:** the same sentence should not appear twice verbatim.
* **Session ID:** `session_id` should be a valid UUID.
* **LLM rubric (Promptfoo + Gemini):** `relevance`, `useful_answer`, and `topic_understanding`. It checks that the response answers the question, gives a real explanation rather than a refusal, and understands passive earning as low-effort earning after opt-in rather than active tasks.

I calibrated this against 7 real responses. Reward timing, privacy wording, and opt-out language varied even across good answers, so none are required.

Implementation: deterministic checks live in the Playwright Part 2 test; semantic grading lives in `llm-eval/promptfooconfig.yaml`.

## What we deliberately do not assert

* **Exact wording:** that would make the test flaky by design.
* **Specific timing or numeric claims:** business-policy details can change without the answer being broken.
* **Response timing:** there is no fixed timing to assert on.
* **Product factuality:** there is no verified source of truth for reward mechanics, so the rubric judges meaning and relevance, not every product claim.

## Why Promptfoo

I picked Promptfoo over DeepEval, Ragas, and ADK because it fits the Node stack cleanly through `npm`, with no second runtime to set up.

Its `llm-rubric` catches what regex cannot: an answer that hits the right keywords but still explains the concept incorrectly.
