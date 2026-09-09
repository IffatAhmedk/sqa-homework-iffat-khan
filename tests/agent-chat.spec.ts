import { expect, test } from '@playwright/test';
import { chatInput, openChat, pill, sendButton } from './helpers/chat';

test('The page loads with the suggested-topic pills visible', async ({ page }) => {
  const suggestions = await openChat(page);

  expect(suggestions.length, 'Suggestion API response has atleast one enabled topic').toBeGreaterThan(0);
  for (const suggestion of suggestions) {
    await expect(pill(page, suggestion.title)).toBeVisible();
  }
  await expect(chatInput(page)).toBeVisible();
  await expect(sendButton(page), 'Send button is disabled until there is text').toBeDisabled();
});
