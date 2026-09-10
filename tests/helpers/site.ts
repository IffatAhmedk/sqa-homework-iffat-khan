import { type Page } from '@playwright/test';

// pre-accept the OneTrust cookie banner so it never overlays the page —
// site-wide, used by every spec, not just the chat widget
export async function seedConsentCookie(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: 'OptanonAlertBoxClosed',
      value: new Date().toISOString(),
      domain: 'ask.permission.ai',
      path: '/',
    },
  ]);
}
