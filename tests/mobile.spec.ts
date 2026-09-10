import { devices, expect, test } from '@playwright/test';
import { ask, chatInput, openChat, pill, sendButton } from './helpers/chat';

// iPhone 13's viewport, kept on Chromium
test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

test('Mobile viewport: suggested topics are visible and the ask flow completes via the send button', async ({
  page,
}) => {
  const [firstTopic] = await openChat(page);

  await expect(pill(page, firstTopic.title)).toBeVisible();
  await expect(chatInput(page)).toBeVisible();

  // no Enter key on a touch keyboard 
  await chatInput(page).fill('What is the Permission Wallet?');
  const { reply } = await ask(page, () => sendButton(page).click());

  expect(reply.message.trim().length, 'agent responded to the mobile ask flow').toBeGreaterThan(0);
});
