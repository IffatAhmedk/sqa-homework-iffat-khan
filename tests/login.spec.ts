import { expect, test } from '@playwright/test';
import { seedConsentCookie } from './helpers/site';

test('Invalid email format is rejected client-side, before any request reaches the backend', async ({
  page,
}) => {
  await seedConsentCookie(page);

  // scoped to our own backend only — third-party analytics (TikTok pixel,
  // etc.) also happen to use an "/api/" path and would otherwise false-positive
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === 'ask.permission.ai' && url.pathname.includes('/api/')) {
      apiRequests.push(request.url());
    }
  });

  await page.goto('/login');
  await page.getByTestId('login-email-input').fill('not-an-email');
  await page.getByTestId('login-password-input').fill('SomePassword123!');
  await page.getByTestId('login-submit-button').click();

  const emailIsInvalid = await page
    .getByTestId('login-email-input')
    .evaluate((element: HTMLInputElement) => !element.validity.valid);
  expect(emailIsInvalid, 'browser-native email validation blocks the malformed address').toBe(
    true,
  );

  await expect(page, 'no navigation happened — still on the login form').toHaveURL(/\/login/);
  expect(
    apiRequests,
    'malformed email never reaches the backend (and never risks the login CAPTCHA)',
  ).toHaveLength(0);
});
