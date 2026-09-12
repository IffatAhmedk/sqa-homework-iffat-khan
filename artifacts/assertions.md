# Validating a non-deterministic response

Topic: **"What is passive earning"**. The wording changes every run, so none of these assertions depend on exact text.

## What we assert

* **Reasonable response size**: 40–1,500 characters. Enough to be a real answer, but not an obviously broken wall of text.

* **Topicality**: the response should hit at least 3 of 4 concept families: "passive", earn/reward/ASK, "extension", and data/activity/share. The wording can vary. A reasonable answer should pass; an off-topic one should not.

* **Basic response quality**: no "I'm not sure" fallback, leaked markup/template tokens, or encoding artifacts.

* **No repeated sentences**: the same sentence should not appear twice verbatim. This catches a failure mode that keyword and length checks would miss.

* **Session ID**: `session_id` should be a valid UUID.

* **LLM rubric (Promptfoo + Gemini)**: three metrics: `relevance`, `useful_answer`, and `topic_understanding`. The rubric checks that the answer responds to the question, gives an actual explanation rather than a refusal, and understands passive earning as low-effort earning after opt-in rather than active tasks.

I calibrated this against 7 real sampled responses. Reward timing, privacy wording, and opt-out language varied even across clearly good answers, so I don't require any of those in the response.

## What we deliberately do not assert, and why

* **Exact wording**: that's the trap with a non-deterministic response.

* **Specific timing or numeric claims** such as "weekly" or "Mondays": those are business-policy details that can change without the answer itself being broken.

* **Response timing**: the challenge explicitly says there is no fixed timing to assert on.

* **Product factuality**: I don't have a verified source of truth for the actual reward mechanics, so the rubric judges whether the answer makes sense and stays on-topic, not whether every product claim is factually correct.

## Why Promptfoo

I picked Promptfoo over DeepEval, Ragas, and ADK because it fits this stack cleanly: 
Node CLI, installed through `npm`, with no second runtime to set up. That matters when the reviewer should be able to clone and run the project in about 5 minutes.

Its `llm-rubric` also catches things regex cannot, such as an answer that includes all the right keywords but still explains the concept incorrectly or makes an unjustified guarantee.
