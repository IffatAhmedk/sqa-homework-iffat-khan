import { expect, test } from '@playwright/test';
import { ASK_ENDPOINT } from './apis/chat-apis';
import { ask, chatInput, openChat, pill, sendButton } from './helpers/chat';

test('The page loads with the suggested-topic pills visible', async ({ page }) => {
  const suggestions = await openChat(page);

  expect(suggestions.length, 'Suggestion API response has atleast one enabled topic').toBeGreaterThan(0);
  for (const suggestion of suggestions) {
    await expect(pill(page, suggestion.title)).toBeVisible();
  }
  await expect(chatInput(page)).toBeVisible();
  await expect(sendButton(page), 'Send button is disabled until there is text').toBeDisabled();
});

test('Clicking a suggested topic produces an agent response', async ({ page }) => {
  const [firstTopic] = await openChat(page);

  const { sentMessage } = await ask(page, () => pill(page, firstTopic.title).click());

  expect(sentMessage, 'POST payload carries the topic prompt').toBe(firstTopic.prompt);
});

test('Submitting a free-text question via the ASK input produces an agent response', async ({ page }) => {
  await openChat(page);
  const question =
    "There's tons of data that I've previously shared before signing up here, how do I earn with that?";

  await chatInput(page).fill(question);
  const { sentMessage } = await ask(page, () => chatInput(page).press('Enter'));

  expect(sentMessage, 'POST payload carries exactly what was typed').toBe(question);
  await expect(chatInput(page), 'composer is empty and ready for the next message').toHaveValue('');
});

test('Shift+Enter creates a new line instead of sending', async ({ page }) => {
  await openChat(page);
  const line1 =
    "There's tons of data that I've previously shared before signing up here...";
  const line2 = 'how do I earn with that?';

  const askRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(ASK_ENDPOINT) && request.method() === 'POST') {
      askRequests.push(request.url());
    }
  });

  await chatInput(page).fill(line1);
  await chatInput(page).press('Shift+Enter');
  await chatInput(page).pressSequentially(line2);

  await expect(chatInput(page), 'Shift+Enter inserted a real newline').toHaveValue(
    `${line1}\n${line2}`,
  );
  // give an accidental submit a moment to fire before asserting it didn't
  await page.waitForTimeout(1_000);
  expect(askRequests, 'Shift+Enter must not submit the message').toHaveLength(0);
});
