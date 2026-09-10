import { expect, test } from '@playwright/test';
import { ASK_ENDPOINT } from './apis/chat-apis';
import { openChat, pill, stopButton } from './helpers/chat';

test('Stop button cancels an in-flight response and shows "Response stopped!"', async ({
  page,
}) => {
  const [firstTopic] = await openChat(page);

  // Agent responses resolve in well under a second. 
  // This holds the request open at the network layer
  // in order to reliably stop the request
  await page.route(`**${ASK_ENDPOINT}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue().catch(() => {
      // the app aborted the request while we were holding it — expected
    });
  });

  const requestFailedPromise = new Promise<string | null>((resolve) => {
    page.on('requestfailed', (request) => {
      if (request.url().includes(ASK_ENDPOINT)) resolve(request.failure()?.errorText ?? null);
    });
  });

  await pill(page, firstTopic.title).click();
  await expect(stopButton(page), 'stop button appears while the response is held pending').toBeVisible();
  await stopButton(page).click();

  const errorText = await requestFailedPromise;
  expect(errorText, 'the held POST request was aborted').toBe(
    'net::ERR_ABORTED',
  );
  await expect(
    page.getByText('Response stopped!', { exact: true }),
    '"Response stopped!" replaced the answer in the agent bubble',
  ).toBeVisible();
});
