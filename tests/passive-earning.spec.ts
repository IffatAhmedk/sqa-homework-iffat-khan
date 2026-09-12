import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ask, openChat, pill } from './helpers/chat';


// Part 2: validate the non-deterministic answer to "What is passive earning".

// Wording changes every run, so we will not be asserting exact text

// More details in artifacts/assertions.md for the reasoning behind what's
//  checked and what is deliberately left unchecked.

const TOPIC = 'What is passive earning';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// concept families a reasonable answer draws on. requiring 3 of 4 : pass on every 
// reasonable phrasing, fail on a genuinely broken one.

const CONCEPTS = {
  passive: /passive/i,
  reward: /\b(earn|reward|ask)\b/i,
  extension: /extension/i,
  dataActivity: /\b(data|activity|share|sharing)\b/i,
};

const FAILURE_MARKERS = /i'?m not sure|something went wrong|error|cannot help|can'?t help/i;

// leaked markup/template vars, a unicode replacement char, or an unescaped
// HTML entity slipping into rendered text
const UNSAFE_ARTIFACTS = /<\/?[a-z]+>|\{\{|�|&(amp|lt|gt|quot|#\d+);/i;

// a known LLM failure mode is looping — the same sentence generated twice.
// keyword/length checks wouldn't catch this; this does.
function hasRepeatedSentence(text: string): boolean {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().toLowerCase())
    .filter((sentence) => sentence.length > 12); // skip trivial fragments
  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (seen.has(sentence)) return true;
    seen.add(sentence);
  }
  return false;
}

test('"What is passive earning" answer passes deterministic checks, and an LLM rubric when a grader key is available', async ({
  page,
}, testInfo) => {
  // the promptfoo config grades 4 rubric metrics sequentially against the
  // same answer — 4 real API round-trips can comfortably exceed the
  // default 90s test timeout, so this test alone gets more room
  test.setTimeout(150_000);

  const suggestions = await openChat(page);
  const topic = suggestions.find((s) => s.title === TOPIC);
  expect(topic, `"${TOPIC}" is an enabled suggested topic`).toBeTruthy();

  const { reply, sentMessage } = await ask(page, () => pill(page, topic!.title).click());

  // shape: a real answer, not a stub or an essay dump
  expect(reply.message.length).toBeGreaterThanOrEqual(40);
  expect(reply.message.length).toBeLessThanOrEqual(1_500);

  // topicality: engages with passive earning specifically, not generic
  // company boilerplate that could answer any topic
  const hit = Object.keys(CONCEPTS).filter((key) =>
    CONCEPTS[key as keyof typeof CONCEPTS].test(reply.message),
  );
  expect(
    hit.length,
    `covers at least 3 of 4 concept families (matched: ${hit.join(', ') || 'none'})`,
  ).toBeGreaterThanOrEqual(3);

  // health: not the off-topic fallback, no leaked markup/encoding artifacts
  expect(reply.message).not.toMatch(FAILURE_MARKERS);
  expect(reply.message).not.toMatch(UNSAFE_ARTIFACTS);

  // not a degenerate/looping generation
  expect(hasRepeatedSentence(reply.message), 'no sentence repeats verbatim').toBe(false);

  // session contract
  expect(reply.session_id).toMatch(UUID_RE);

  // --- Part 2's LLM-eval requirement ---
  // deliberately not gated behind test.skip(): the deterministic checks
  // above always run and must always pass, even in a fresh clone with no
  // LLM key configured. This block only layers the promptfoo rubric on top
  // when a grader is actually available.
  const hasGrader = Boolean(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY,
  );
  if (!hasGrader) {
    testInfo.annotations.push({
      type: 'skipped-check',
      description:
        'promptfoo llm-rubric skipped: set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY to run it',
    });
    return;
  }

  const outDir = path.resolve('llm-eval/output');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'answer.txt'), reply.message);
  writeFileSync(path.join(outDir, 'question.txt'), sentMessage);
  const resultPath = path.join(outDir, 'result.json');

  // promptfoo keeps its own local SQLite db (eval history/cache) under
  // ~/.promptfoo/ — if a previous run was killed mid-write (our own timeout
  // below, or anything else), it can leave that db locked/corrupted, and
  // the NEXT run hangs forever at "Running database migrations" before it
  // ever reaches a real API call. We don't need that history, so wipe it
  // proactively every attempt rather than debugging this by hand each time.
  const promptfooDbGlob = path.join(os.homedir(), '.promptfoo', 'promptfoo.db');
  const wipePromptfooDb = () => {
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(promptfooDbGlob + suffix, { force: true });
    }
  };

  // a failed promptfoo run may not write -o at all — remove any stale
  // result first so a leftover from a previous run can never be silently
  // read and reported as if it were this run's grade
  rmSync(resultPath, { force: true });

  // the grader API occasionally returns a transient 503 "high demand" error
  // (common on Gemini's free tier) — that's worth a bounded retry; a real
  // rubric rejection or config error would just fail the same way again,
  // so those give up immediately instead of wasting attempts
  const MAX_ATTEMPTS = 3;
  const TRANSIENT_ERROR = /UNAVAILABLE|"code":\s*503|currently experiencing high demand/i;

  let exitCode = 0;
  let stderr = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    rmSync(resultPath, { force: true });
    wipePromptfooDb();
    exitCode = 0;
    stderr = '';
    try {
      execFileSync(
        'npx',
        ['promptfoo', 'eval', '-c', 'llm-eval/promptfooconfig.yaml', '-o', resultPath, '--no-cache', '--verbose'],
        // a hard ceiling — execFileSync has no timeout by default, and being
        // synchronous it can block the whole worker thread if the grading
        // call hangs, which even Playwright's own test timeout can't rescue.
        // kept below the 150s test timeout above so this fires first, with a
        // diagnosable message, rather than colliding with Playwright's own
        // blunter timeout
        { stdio: 'pipe', timeout: 110_000 },
      );
    } catch (e) {
      // stdout carries promptfoo's own progress output (which assertion it
      // was on when killed) — stderr alone hid that on earlier failures
      const err = e as { status?: number; signal?: string; stdout?: Buffer; stderr?: Buffer };
      exitCode = err.status ?? 1;
      const stdout = err.stdout?.toString() ?? '';
      const rawStderr = err.stderr?.toString() ?? '';
      stderr = err.signal
        ? `killed by ${err.signal} after the 110s ceiling\n\n--- stdout up to kill ---\n${stdout || '(none captured)'}\n\n--- stderr up to kill ---\n${rawStderr || '(none captured)'}`
        : `${rawStderr}\n\n--- stdout ---\n${stdout}`;
    }

    if (exitCode === 0) break;

    const resultText = existsSync(resultPath) ? readFileSync(resultPath, 'utf-8') : '';
    const isTransient = TRANSIENT_ERROR.test(resultText || stderr);
    if (!isTransient || attempt === MAX_ATTEMPTS) break;

    await new Promise((resolve) => setTimeout(resolve, 5_000 * attempt));
  }

  if (!existsSync(resultPath)) {
    await testInfo.attach('promptfoo-stderr', { body: stderr || '(no output captured)' });
    expect(false, `promptfoo never wrote a result — see attached stderr. exitCode=${exitCode}`).toBe(
      true,
    );
    return;
  }

  const results = JSON.parse(readFileSync(resultPath, 'utf-8'));
  const graded = results.results.results[0];
  await testInfo.attach('llm-rubric-verdict', {
    body: JSON.stringify(
      { question: sentMessage, answer: reply.message, grade: graded.gradingResult, stderr },
      null,
      2,
    ),
    contentType: 'application/json',
  });

  expect(exitCode, 'promptfoo rubric passed (verdict attached to this test)').toBe(0);
});
